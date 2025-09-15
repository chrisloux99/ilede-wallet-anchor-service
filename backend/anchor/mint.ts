import { api } from "encore.dev/api";
import { validate } from "../common/validation";
import { AuthorizationError, handleStellarError } from "../common/errors";
import { secret } from "encore.dev/config";
import { Asset, Keypair, Operation, Server, TransactionBuilder } from "stellar-sdk";

interface MintRequest {
  amount: string; // decimal string with up to 7 decimals per Stellar convention
  admin_token?: string; // simple protection for testnet ops
}

interface MintResponse {
  distribution_public_key: string;
  asset_code: string;
  trustline_tx_hash?: string;
  mint_tx_hash: string;
}

const stellarHorizonUrl = secret("StellarHorizonUrl");
const networkPassphrase = secret("StellarNetworkPassphrase");
const issuingAccountSecretKey = secret("IssuingAccountSecretKey");
const distributionAccountSecretKey = secret("DistributionAccountSecretKey");
const assetCodeSecret = secret("AssetCode");
const adminTokenSecret = secret("AdminToken");

export const adminMint = api<MintRequest, MintResponse>(
  { expose: true, method: "POST", path: "/anchor/admin/mint" },
  async (req) => {
    try {
      validate().required("amount", req.amount).amount("amount", req.amount).validate();

      // Simple admin token guard (for testnet). If AdminToken is set, require it; otherwise allow.
      try {
        const expected = await adminTokenSecret();
        if (expected && req.admin_token !== expected) {
          throw new AuthorizationError("Invalid admin token");
        }
      } catch (e) {
        // If secret is not set, skip (treat as open in dev/test)
      }

      const server = new Server(await stellarHorizonUrl());
      const passphrase = await networkPassphrase();

      const issuerKP = Keypair.fromSecret(await issuingAccountSecretKey());
      const distributionKP = Keypair.fromSecret(await distributionAccountSecretKey());
      const assetCode = await assetCodeSecret();
      const asset = new Asset(assetCode, issuerKP.publicKey());

      // Ensure distribution has trustline to the asset
      const distAccount = await server.loadAccount(distributionKP.publicKey());
      const hasTrust = distAccount.balances.some(
        (b: any) => b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer()
      );

      let trustline_tx_hash: string | undefined = undefined;
      if (!hasTrust) {
        const fee = await server.fetchBaseFee();
        const tx = new TransactionBuilder(distAccount, {
          fee: fee.toString(),
          networkPassphrase: passphrase,
        })
          .addOperation(
            Operation.changeTrust({
              asset,
            })
          )
          .setTimeout(30)
          .build();
        tx.sign(distributionKP);
        const res = await server.submitTransaction(tx);
        trustline_tx_hash = res.hash;
      }

      // Issue asset from issuer to distribution
      const issuerAccount = await server.loadAccount(issuerKP.publicKey());
      const fee2 = await server.fetchBaseFee();
      const paymentTx = new TransactionBuilder(issuerAccount, {
        fee: fee2.toString(),
        networkPassphrase: passphrase,
      })
        .addOperation(
          Operation.payment({
            destination: distributionKP.publicKey(),
            asset,
            amount: req.amount,
          })
        )
        .setTimeout(30)
        .build();

      paymentTx.sign(issuerKP);
      const paymentRes = await server.submitTransaction(paymentTx);

      return {
        distribution_public_key: distributionKP.publicKey(),
        asset_code: assetCode,
        trustline_tx_hash,
        mint_tx_hash: paymentRes.hash,
      };
    } catch (error: any) {
      if (error.code) throw error;
      handleStellarError(error);
    }
  }
);
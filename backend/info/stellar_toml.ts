import { api } from "encore.dev/api";

export interface StellarTomlResponse {
  content: string;
}

// Serves the stellar.toml file (SEP-1)
export const stellarToml = api<void, StellarTomlResponse>(
  { expose: true, method: "GET", path: "/.well-known/stellar.toml" },
  async () => {
    const stellarToml = `
VERSION="2.0.0"

[DOCUMENTATION]
ORG_NAME="iLede"
ORG_DBA="iLede Wallet"
ORG_URL="https://ilede.example.com"
ORG_LOGO="https://ilede.example.com/logo.png"
ORG_DESCRIPTION="iLede Wallet Anchor Service providing fiat on- and off-ramping for iLede Coin and USDC"
ORG_PHYSICAL_ADDRESS="123 Blockchain St, Crypto City, CC 12345"
ORG_PHYSICAL_ADDRESS_ATTESTATION="https://ilede.example.com/address-attestation.pdf"
ORG_PHONE_NUMBER="+1-555-ILEDE-01"
ORG_KEYBASE="ilede_official"
ORG_TWITTER="ilede_wallet"
ORG_GITHUB="ilede-org"
ORG_OFFICIAL_EMAIL="support@ilede.example.com"

[PRINCIPALS]
[[PRINCIPALS]]
name="John Doe"
email="john@ilede.example.com"
keybase="johndoe"
twitter="johndoe_ilede"
github="johndoe"
id_photo_hash="be688838ca8686e5c90689bf2ab585cef1137c999b48c70b92f67a5c34dc15697b5d11c982ed6d71be1e1e7f7b4e0733884aa97c3f7a339a8ed03577cf74be09"
verification_photo_hash="016ba8c4cfde65af99cb5fa8b8a37e2eb73f481b3ae34991666df2e04feb6c038666ebd1ec2b6f623967756033c702dde5f423f7d47ab6ed1827ff53783731f7"

[CURRENCIES]
[[CURRENCIES]]
code="iLede"
issuer="<ISSUING_ACCOUNT_PUBLIC_KEY>"
display_decimals=7
name="iLede Coin"
desc="The native digital asset of the iLede ecosystem, designed for seamless transactions and value transfer."
conditions="iLede Coin is subject to the terms and conditions outlined in our user agreement."
image="https://ilede.example.com/assets/ilede-coin-icon.png"
fixed_number=2000000000
max_number=2000000000
is_unlimited=false
anchor_asset_type="crypto"
anchor_asset="iLede"
redemption_instructions="iLede Coins can be redeemed through the iLede Wallet application or via our anchor services."
collateral_addresses=["<DISTRIBUTION_ACCOUNT_PUBLIC_KEY>"]
collateral_address_messages=["Distribution account for iLede Coin"]
collateral_address_signatures=[""]
regulated=false
approval_server=""
approval_criteria=""
kyc_required=true
kyc_fields=["first_name", "last_name", "email_address", "id_type", "id_country_code", "id_issue_date", "id_expiration_date", "id_number"]

[[CURRENCIES]]
code="USDC"
issuer="GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
display_decimals=2
name="USD Coin"
desc="USDC is a fully collateralized US dollar stablecoin."
conditions="USDC is issued by Centre and is subject to Centre's terms of service."
image="https://centre.io/images/usdc/usdc-icon-86x86.png"
anchor_asset_type="fiat"
anchor_asset="USD"
redemption_instructions="USDC can be redeemed for US dollars through authorized exchanges and our anchor services."
regulated=true
kyc_required=true
kyc_fields=["first_name", "last_name", "email_address", "id_type", "id_country_code", "id_issue_date", "id_expiration_date", "id_number"]

[VALIDATORS]
[[VALIDATORS]]
ALIAS="ilede-validator-1"
DISPLAY_NAME="iLede Validator 1"
HOST="validator1.ilede.example.com:11625"
PUBLIC_KEY="<VALIDATOR_PUBLIC_KEY>"
HISTORY="https://validator1.ilede.example.com/history"

[QUORUM_SET]
THRESHOLD_PERCENT=67
VALIDATORS=["<VALIDATOR_PUBLIC_KEY>"]

[[QUORUM_SET.INNER_QUORUM_SETS]]
THRESHOLD_PERCENT=51
VALIDATORS=["GA2HGBJIJKI6O4XEM7CZWY5PS6GKSXL6D34ERAJYQSPYA6X6AI7HYW36", "GB6REF5GOGGSEHZ3L2YK6K4T4KX3YDMWHDCPMV7MZJDLHBDNZXEPRBGM"]

[TRANSFER_SERVER]
TRANSFER_SERVER="https://anchor.ilede.example.com"
TRANSFER_SERVER_SEP0024="https://anchor.ilede.example.com/sep24"

[ANCHOR_QUOTE_SERVER]
QUOTE_SERVER="https://anchor.ilede.example.com"

[KYC_SERVER]
KYC_SERVER="https://kyc.ilede.example.com"

[WEB_AUTH_ENDPOINT]
WEB_AUTH_ENDPOINT="https://auth.ilede.example.com/auth"

[FEDERATION_SERVER]
FEDERATION_SERVER="https://federation.ilede.example.com/federation"

[SIGNING_KEY]
key="<SIGNING_KEY_PUBLIC>"
`;

    // Set proper content type for TOML
    return { content: stellarToml.trim() };
  }
);

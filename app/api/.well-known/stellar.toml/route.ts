import { NextResponse } from 'next/server';
import { Keypair } from 'stellar-sdk';

const HOME_DOMAIN = process.env.HOME_DOMAIN || 'il3pay.com';

export async function GET() {
  try {
    const issuer = process.env.ISSUING_ACCOUNT_PUBLIC_KEY || '';
    const signingKeySecret = process.env.SIGNING_KEY_SECRET;

    if (!signingKeySecret) {
      return new NextResponse('Server not configured: SIGNING_KEY_SECRET missing', { status: 500 });
    }

    let signingKey: string;
    try {
      const kp = Keypair.fromSecret(signingKeySecret);
      signingKey = kp.publicKey();
    } catch {
      return new NextResponse('Server misconfigured: invalid SIGNING_KEY_SECRET', { status: 500 });
    }

    const baseUrl = `https://${HOME_DOMAIN}`;
    const orgName = process.env.ORG_NAME || 'iLede';
    const orgEmail = process.env.ORG_EMAIL || `support@${HOME_DOMAIN}`;

    const toml = `VERSION="2.0.0"

[DOCUMENTATION]
ORG_NAME="${orgName}"
ORG_DBA="${orgName} Wallet"
ORG_URL="${baseUrl}"
ORG_DESCRIPTION="${orgName} Wallet Anchor Service"
ORG_OFFICIAL_EMAIL="${orgEmail}"

[CURRENCIES]
[[CURRENCIES]]
code="iLede"
issuer="${issuer}"
display_decimals=7
name="iLede Coin"
desc="The native digital asset of the ${orgName} ecosystem"
anchor_asset_type="crypto"
anchor_asset="iLede"
is_unlimited=false
fixed_number=2000000000
max_number=2000000000
kyc_required=true

[[CURRENCIES]]
code="USDC"
issuer="GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
display_decimals=2
name="USD Coin"
desc="USDC is a fully collateralized US dollar stablecoin"
anchor_asset_type="fiat"
anchor_asset="USD"
regulated=true
kyc_required=true

[TRANSFER_SERVER]
TRANSFER_SERVER="${baseUrl}"

[ANCHOR_QUOTE_SERVER]
QUOTE_SERVER="${baseUrl}"

[KYC_SERVER]
KYC_SERVER="${baseUrl}"

[WEB_AUTH_ENDPOINT]
WEB_AUTH_ENDPOINT="${baseUrl}/api/auth"

[SIGNING_KEY]
key="${signingKey}"`;

    return new NextResponse(toml, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('stellar.toml error:', error);
    return new NextResponse('Error generating stellar.toml', { status: 500 });
  }
}

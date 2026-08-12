import { NextResponse } from 'next/server';

/**
 * SEP-6/24 /info endpoint.
 * Describes supported assets, fees, and capabilities.
 */
export async function GET() {
  const assetCode = process.env.ASSET_CODE || 'iLede';
  const issuingAccount = process.env.ISSUING_ACCOUNT_PUBLIC_KEY || '';

  return NextResponse.json({
    deposit: {
      [assetCode]: {
        enabled: true,
        authentication_required: true,
        min_amount: '1.0000000',
        max_amount: '100000.0000000',
        fee_fixed: '0.1000000',
        fee_percent: 0.1,
        fields: {
          account: {
            description: 'Stellar account ID to deposit into',
            optional: false,
          },
          amount: {
            description: 'Amount to deposit',
            optional: true,
          },
        },
      },
      USDC: {
        enabled: true,
        authentication_required: true,
        min_amount: '1.00',
        max_amount: '100000.00',
        fee_fixed: '0.10',
        fee_percent: 0.1,
        fields: {
          account: {
            description: 'Stellar account ID to deposit into',
            optional: false,
          },
          amount: {
            description: 'Amount to deposit',
            optional: true,
          },
        },
      },
    },
    withdraw: {
      [assetCode]: {
        enabled: true,
        authentication_required: true,
        min_amount: '1.0000000',
        max_amount: '100000.0000000',
        fee_fixed: '0.1000000',
        fee_percent: 0.1,
        types: {
          bank_account: {
            fields: {
              dest: { description: 'Bank account number', optional: false },
            },
          },
          cash: {
            fields: {
              dest: { description: 'Cash pickup location or reference', optional: false },
            },
          },
          mobile_money: {
            fields: {
              dest: { description: 'Mobile money number', optional: false },
            },
          },
        },
      },
      USDC: {
        enabled: true,
        authentication_required: true,
        min_amount: '1.00',
        max_amount: '100000.00',
        fee_fixed: '0.10',
        fee_percent: 0.1,
        types: {
          bank_account: {
            fields: {
              dest: { description: 'Bank account number', optional: false },
            },
          },
          cash: {
            fields: {
              dest: { description: 'Cash pickup location or reference', optional: false },
            },
          },
          mobile_money: {
            fields: {
              dest: { description: 'Mobile money number', optional: false },
            },
          },
        },
      },
    },
    fee: {
      enabled: true,
    },
    transactions: {
      enabled: true,
    },
    transaction: {
      enabled: true,
    },
    features: {
      account_creation: false,
      claimable_balances: false,
    },
    anchor_asset_type: 'crypto',
    issuer: {
      name: process.env.ORG_NAME || 'iLede',
      url: `https://${process.env.HOME_DOMAIN || 'il3pay.com'}`,
    },
  });
}

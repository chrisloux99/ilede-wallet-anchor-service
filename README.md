# iLede Wallet Anchor Service

A comprehensive Stellar anchor service built with Encore.ts, providing fiat on- and off-ramping for iLede Coin and USDC with full SEP compliance.

## Features

### Core Stellar Network Architecture
- **iLede Coin Asset**: Custom digital asset with 2B total supply
- **Issuing Account**: Dedicated account for minting iLede Coins
- **Distribution Account**: Handles all outgoing payments and distributions
- **Airdrop System**: Automatic funding of new wallets (1 XLM + 0.01 iLede)

### Anchor Services
- **Deposit & Withdrawal**: Fiat on/off-ramping for iLede and USDC
- **KYC Integration**: Customer verification and compliance
- **Quote System**: Real-time pricing for asset exchanges
- **Transaction Tracking**: Complete audit trail of all operations

### SEP Compliance
- **SEP-1**: Stellar Info File (stellar.toml)
- **SEP-6**: Deposit and Withdrawal API
- **SEP-10**: Stellar Web Authentication
- **SEP-12**: KYC API
- **SEP-24**: Hosted Deposit and Withdrawal
- **SEP-31**: Cross-Border Payments API
- **SEP-38**: Anchor RFQ API

## Technology Stack

### Backend
- **Encore.ts**: TypeScript framework for backend services
- **SQL Database**: PostgreSQL for data persistence
- **Secrets Management**: Secure configuration for sensitive data

### Frontend
- **React**: Modern UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Beautiful UI components
- **React Query**: Data fetching and state management

## Getting Started

### Prerequisites
1. Create your Stellar accounts (issuing and distribution)
2. Set up your environment secrets in the Infrastructure tab

### Required Secrets
Configure these secrets in the Infrastructure tab:

- `StellarHorizonUrl`: Stellar Horizon API URL
- `StellarNetworkPassphrase`: Network passphrase
- `IssuingAccountPublicKey`: Public key of issuing account
- `IssuingAccountSecretKey`: Secret key of issuing account
- `DistributionAccountPublicKey`: Public key of distribution account
- `DistributionAccountSecretKey`: Secret key of distribution account
- `KycProviderApiKey`: API key for KYC service
- `BankingApiKey`: API key for banking integration

### Initial Setup

1. **Create Stellar Accounts**:
   - Generate issuing account keypair
   - Generate distribution account keypair
   - Set AUTH_REQUIRED_FLAG and AUTH_REVOCABLE_FLAG on issuing account
   - Create iLede asset
   - Transfer 1.2B iLede from issuing to distribution account

2. **Configure Secrets**:
   - Add all required secrets in the Infrastructure tab
   - Update stellar.toml with your actual account keys

3. **Deploy and Test**:
   - Deploy the application
   - Test wallet creation and airdrop functionality
   - Verify anchor services are working

## API Endpoints

### Wallet Service
- `POST /wallet/create` - Create new wallet with airdrop
- `GET /wallet/:account_id/balance` - Get account balances

### Anchor Service
- `GET /deposit` - Initiate deposit transaction
- `GET /withdraw` - Initiate withdrawal transaction
- `GET /transaction/:id` - Get transaction status

### KYC Service
- `GET /customer` - Get customer KYC status
- `PUT /customer` - Submit KYC information

### Auth Service
- `GET /auth` - Get authentication challenge
- `POST /auth` - Submit signed challenge for token

### Quotes Service
- `POST /quote` - Request for quote (RFQ)

### Info Service
- `GET /.well-known/stellar.toml` - Stellar info file

## Security Considerations

1. **Secret Management**: All sensitive data is managed through Encore's secrets system
2. **Account Security**: Issuing account has appropriate flags set for control
3. **KYC Compliance**: Identity verification required for large transactions
4. **Transaction Monitoring**: Complete audit trail of all operations
5. **Rate Limiting**: Built-in protection against abuse

## Development

The application is structured as multiple Encore.ts services:

- **auth**: Stellar Web Authentication (SEP-10)
- **wallet**: Account creation and management
- **anchor**: Deposit/withdrawal services (SEP-6)
- **kyc**: Customer verification (SEP-12)
- **quotes**: Request for quotes (SEP-38)
- **info**: Stellar info file serving (SEP-1)

Each service is independently deployable and scalable.

## Compliance

This anchor service implements industry best practices for:

- **KYC/AML**: Customer identity verification
- **Transaction Monitoring**: Anti-money laundering compliance
- **Data Protection**: Secure handling of sensitive information
- **Regulatory Reporting**: Audit trails and transaction logging

## Support

For technical support or questions about the iLede Wallet Anchor Service:

- Email: support@ilede.example.com
- Documentation: [Stellar SEP Documentation](https://stellar.org/protocol)
- Encore.ts Documentation: [https://encore.dev/docs](https://encore.dev/docs)

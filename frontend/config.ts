// Configuration values for the iLede Wallet frontend

// Stellar Network Configuration
// TODO: Set these values based on your deployment environment
export const stellarConfig = {
  // The Stellar Horizon URL for API calls
  horizonUrl: "https://horizon-testnet.stellar.org", // Testnet
  
  // The Stellar network passphrase
  networkPassphrase: "Test SDF Network ; September 2015", // Testnet
  
  // The issuing account public key for iLede Coin
  // TODO: Replace with your actual issuing account public key
  iledeIssuer: "<ISSUING_ACCOUNT_PUBLIC_KEY>",
  
  // The USDC issuer on Stellar
  usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN", // Testnet USDC
};

// API Configuration
export const apiConfig = {
  // Base URL for the anchor service APIs
  // This will be automatically determined based on the deployment
  baseUrl: window.location.origin,
};

// Application Configuration
export const appConfig = {
  // Application name and branding
  name: "iLede Wallet",
  description: "Your gateway to the Stellar ecosystem",
  
  // Support contact information
  supportEmail: "support@ilede.example.com",
  
  // Feature flags
  features: {
    kycEnabled: true,
    quotesEnabled: true,
    depositEnabled: true,
    withdrawEnabled: true,
  },
};

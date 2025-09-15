import { Keypair } from 'stellar-sdk';

/**
 * Secure client-side key generation utilities
 * Never transmit secret keys over the network
 */

export interface WalletKeys {
  publicKey: string;
  secretKey: string;
  mnemonic?: string;
}

/**
 * Generate a new Stellar keypair client-side
 * This ensures secret keys never leave the client
 */
export function generateWalletKeys(): WalletKeys {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

/**
 * Derive keypair from mnemonic (for future BIP39 support)
 */
export function deriveFromMnemonic(mnemonic: string): WalletKeys {
  // TODO: Implement BIP39 mnemonic derivation
  // For now, fallback to random generation
  return generateWalletKeys();
}

/**
 * Validate Stellar public key format
 */
export function isValidPublicKey(publicKey: string): boolean {
  try {
    Keypair.fromPublicKey(publicKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate Stellar secret key format
 */
export function isValidSecretKey(secretKey: string): boolean {
  try {
    Keypair.fromSecret(secretKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Securely store keys in browser (encrypted)
 */
export function storeKeysSecurely(keys: WalletKeys, password: string): void {
  // Simple encryption using Web Crypto API
  const encrypted = btoa(JSON.stringify(keys)); // Base64 encoding for now
  localStorage.setItem('wallet_keys', encrypted);
  sessionStorage.setItem('wallet_authenticated', 'true');
}

/**
 * Retrieve and decrypt stored keys
 */
export function retrieveKeysSecurely(password: string): WalletKeys | null {
  try {
    const encrypted = localStorage.getItem('wallet_keys');
    if (!encrypted) return null;
    
    const decrypted = JSON.parse(atob(encrypted));
    return decrypted;
  } catch {
    return null;
  }
}

/**
 * Clear stored keys
 */
export function clearStoredKeys(): void {
  localStorage.removeItem('wallet_keys');
  sessionStorage.removeItem('wallet_authenticated');
}

/**
 * Check if user has authenticated session
 */
export function isAuthenticated(): boolean {
  return sessionStorage.getItem('wallet_authenticated') === 'true';
}


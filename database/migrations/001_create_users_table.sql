-- Users table: stores wallet owners and KYC data
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    stellar_account_id VARCHAR(56) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    id_type VARCHAR(50),
    id_country_code VARCHAR(5),
    id_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by Stellar account
CREATE INDEX IF NOT EXISTS idx_users_stellar_account ON users(stellar_account_id);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

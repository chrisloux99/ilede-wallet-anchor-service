CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  stellar_account_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
  kyc_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_stellar_account_id ON users(stellar_account_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);

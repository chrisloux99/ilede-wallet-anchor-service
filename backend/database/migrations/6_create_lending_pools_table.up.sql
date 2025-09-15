CREATE TABLE lending_pools (
  id BIGSERIAL PRIMARY KEY,
  pool_address TEXT UNIQUE NOT NULL,
  lender_account TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  total_amount DECIMAL(20, 7) NOT NULL,
  available_amount DECIMAL(20, 7) NOT NULL,
  interest_rate DECIMAL(5, 2) NOT NULL, -- APR percentage
  term_days INTEGER NOT NULL,
  collateral_ratio DECIMAL(5, 2) NOT NULL, -- Required collateral ratio
  total_loaned DECIMAL(20, 7) DEFAULT 0,
  total_interest_earned DECIMAL(20, 7) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lending_pools_pool_address ON lending_pools(pool_address);
CREATE INDEX idx_lending_pools_lender ON lending_pools(lender_account);
CREATE INDEX idx_lending_pools_asset ON lending_pools(asset_code);
CREATE INDEX idx_lending_pools_status ON lending_pools(status);

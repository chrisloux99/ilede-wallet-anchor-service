CREATE TABLE amm_pools (
  id BIGSERIAL PRIMARY KEY,
  pool_address TEXT UNIQUE NOT NULL,
  asset_a TEXT NOT NULL,
  asset_b TEXT NOT NULL,
  liquidity_a DECIMAL(20, 7) NOT NULL DEFAULT 0,
  liquidity_b DECIMAL(20, 7) NOT NULL DEFAULT 0,
  fee_rate INTEGER NOT NULL DEFAULT 30, -- 0.3% = 30
  total_fees_earned DECIMAL(20, 7) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_amm_pools_pool_address ON amm_pools(pool_address);
CREATE INDEX idx_amm_pools_assets ON amm_pools(asset_a, asset_b);
CREATE INDEX idx_amm_pools_status ON amm_pools(status);

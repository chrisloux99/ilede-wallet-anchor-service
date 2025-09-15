CREATE TABLE liquidity_stakes (
  id BIGSERIAL PRIMARY KEY,
  user_account TEXT NOT NULL,
  amm_pool_id BIGINT REFERENCES amm_pools(id),
  liquidity_amount DECIMAL(20, 7) NOT NULL,
  staking_period_days INTEGER NOT NULL,
  expected_rewards DECIMAL(20, 7) NOT NULL,
  actual_rewards DECIMAL(20, 7) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_liquidity_stakes_user ON liquidity_stakes(user_account);
CREATE INDEX idx_liquidity_stakes_pool ON liquidity_stakes(amm_pool_id);
CREATE INDEX idx_liquidity_stakes_status ON liquidity_stakes(status);
CREATE INDEX idx_liquidity_stakes_expires ON liquidity_stakes(expires_at);

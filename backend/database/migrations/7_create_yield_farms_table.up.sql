CREATE TABLE yield_farms (
  id BIGSERIAL PRIMARY KEY,
  user_account TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  amount DECIMAL(20, 7) NOT NULL,
  strategy TEXT NOT NULL CHECK (strategy IN ('liquidity_provision', 'lending', 'staking', 'arbitrage')),
  expected_apy DECIMAL(5, 2) NOT NULL,
  actual_apy DECIMAL(5, 2) DEFAULT 0,
  auto_compound BOOLEAN DEFAULT false,
  total_rewards_earned DECIMAL(20, 7) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_yield_farms_user ON yield_farms(user_account);
CREATE INDEX idx_yield_farms_asset ON yield_farms(asset_code);
CREATE INDEX idx_yield_farms_strategy ON yield_farms(strategy);
CREATE INDEX idx_yield_farms_status ON yield_farms(status);

CREATE TABLE bridge_transfers (
  id BIGSERIAL PRIMARY KEY,
  user_account TEXT NOT NULL,
  source_chain TEXT NOT NULL,
  destination_chain TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  amount DECIMAL(20, 7) NOT NULL,
  destination_address TEXT NOT NULL,
  bridge_fee DECIMAL(20, 7) NOT NULL,
  gas_fee DECIMAL(20, 7) DEFAULT 0,
  total_fee DECIMAL(20, 7) NOT NULL,
  estimated_time INTEGER NOT NULL, -- minutes
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  source_transaction_hash TEXT,
  destination_transaction_hash TEXT,
  error_message TEXT,
  memo TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bridge_transfers_user ON bridge_transfers(user_account);
CREATE INDEX idx_bridge_transfers_status ON bridge_transfers(status);
CREATE INDEX idx_bridge_transfers_chains ON bridge_transfers(source_chain, destination_chain);
CREATE INDEX idx_bridge_transfers_created_at ON bridge_transfers(created_at);

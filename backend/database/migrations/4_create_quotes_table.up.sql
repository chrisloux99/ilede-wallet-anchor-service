CREATE TABLE quotes (
  id BIGSERIAL PRIMARY KEY,
  quote_id TEXT UNIQUE NOT NULL,
  user_id BIGINT REFERENCES users(id),
  sell_asset TEXT NOT NULL,
  buy_asset TEXT NOT NULL,
  sell_amount DECIMAL(20, 7) NOT NULL,
  buy_amount DECIMAL(20, 7) NOT NULL,
  fee DECIMAL(20, 7) DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_quotes_quote_id ON quotes(quote_id);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_expires_at ON quotes(expires_at);

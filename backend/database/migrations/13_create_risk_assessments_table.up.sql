CREATE TABLE risk_assessments (
  id BIGSERIAL PRIMARY KEY,
  user_account TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(20, 7) NOT NULL,
  asset_code TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  approved BOOLEAN NOT NULL,
  requires_manual_review BOOLEAN NOT NULL,
  confidence INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risk_assessments_user ON risk_assessments(user_account);
CREATE INDEX idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX idx_risk_assessments_created_at ON risk_assessments(created_at);

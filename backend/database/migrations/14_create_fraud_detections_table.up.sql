CREATE TABLE fraud_detections (
  id BIGSERIAL PRIMARY KEY,
  user_account TEXT NOT NULL,
  fraud_probability INTEGER NOT NULL,
  recommended_action TEXT NOT NULL CHECK (recommended_action IN ('allow', 'block', 'review', 'escalate')),
  confidence INTEGER NOT NULL,
  transaction_data JSONB,
  behavioral_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fraud_detections_user ON fraud_detections(user_account);
CREATE INDEX idx_fraud_detections_probability ON fraud_detections(fraud_probability);
CREATE INDEX idx_fraud_detections_action ON fraud_detections(recommended_action);
CREATE INDEX idx_fraud_detections_created_at ON fraud_detections(created_at);

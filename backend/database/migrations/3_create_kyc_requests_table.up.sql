CREATE TABLE kyc_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  request_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  submitted_data JSONB,
  verification_result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kyc_requests_user_id ON kyc_requests(user_id);
CREATE INDEX idx_kyc_requests_status ON kyc_requests(status);

CREATE TABLE risk_assessment_factors (
  id BIGSERIAL PRIMARY KEY,
  risk_assessment_id BIGINT REFERENCES risk_assessments(id),
  risk_factor TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_risk_factors_assessment ON risk_assessment_factors(risk_assessment_id);
CREATE INDEX idx_risk_factors_factor ON risk_assessment_factors(risk_factor);

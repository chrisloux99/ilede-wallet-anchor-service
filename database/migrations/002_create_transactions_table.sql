-- Transactions table: stores deposits, withdrawals, and transfers
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdraw', 'transfer')),
    asset_code VARCHAR(12) NOT NULL,
    amount NUMERIC(20, 7) NOT NULL DEFAULT 0,
    amount_out NUMERIC(20, 7),
    amount_fee NUMERIC(20, 7),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    stellar_account_id VARCHAR(56) NOT NULL,
    external_account_id VARCHAR(255),
    stellar_transaction_id VARCHAR(64),
    external_transaction_id VARCHAR(255),
    memo TEXT,
    memo_type VARCHAR(10) DEFAULT 'text',
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    more_info_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_stellar_account ON transactions(stellar_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_stellar_tx ON transactions(stellar_transaction_id);

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

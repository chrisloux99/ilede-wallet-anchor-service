-- Quotes table: stores SEP-38 price quotes
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    sell_asset_code VARCHAR(12) NOT NULL,
    sell_asset_issuer VARCHAR(56),
    buy_asset_code VARCHAR(12) NOT NULL,
    buy_asset_issuer VARCHAR(56),
    sell_amount NUMERIC(20, 7) NOT NULL,
    buy_amount NUMERIC(20, 7) NOT NULL,
    price NUMERIC(20, 7) NOT NULL,
    fee_amount NUMERIC(20, 7) NOT NULL DEFAULT 0,
    fee_percent NUMERIC(5, 4) NOT NULL DEFAULT 0,
    stellar_account_id VARCHAR(56),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_stellar_account ON quotes(stellar_account_id);
CREATE INDEX IF NOT EXISTS idx_quotes_expires ON quotes(expires_at);

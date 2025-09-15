CREATE TABLE nfts (
  id BIGSERIAL PRIMARY KEY,
  token_id TEXT UNIQUE NOT NULL,
  creator_account TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  metadata JSONB,
  collection_id TEXT,
  royalties_percentage DECIMAL(5, 2) DEFAULT 0,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'listed', 'owned', 'burned')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nfts_token_id ON nfts(token_id);
CREATE INDEX idx_nfts_creator ON nfts(creator_account);
CREATE INDEX idx_nfts_collection ON nfts(collection_id);
CREATE INDEX idx_nfts_status ON nfts(status);

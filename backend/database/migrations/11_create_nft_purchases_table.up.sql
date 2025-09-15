CREATE TABLE nft_purchases (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT REFERENCES nft_listings(id),
  buyer_account TEXT NOT NULL,
  seller_account TEXT NOT NULL,
  nft_id BIGINT REFERENCES nfts(id),
  purchase_price DECIMAL(20, 7) NOT NULL,
  currency TEXT NOT NULL,
  royalties_paid DECIMAL(20, 7) DEFAULT 0,
  platform_fee DECIMAL(20, 7) DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nft_purchases_listing ON nft_purchases(listing_id);
CREATE INDEX idx_nft_purchases_buyer ON nft_purchases(buyer_account);
CREATE INDEX idx_nft_purchases_seller ON nft_purchases(seller_account);
CREATE INDEX idx_nft_purchases_nft ON nft_purchases(nft_id);
CREATE INDEX idx_nft_purchases_status ON nft_purchases(status);

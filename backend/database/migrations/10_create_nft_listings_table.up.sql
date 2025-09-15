CREATE TABLE nft_listings (
  id BIGSERIAL PRIMARY KEY,
  nft_id BIGINT REFERENCES nfts(id),
  seller_account TEXT NOT NULL,
  price DECIMAL(20, 7) NOT NULL,
  currency TEXT NOT NULL,
  auction_end_time TIMESTAMP,
  minimum_bid DECIMAL(20, 7),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nft_listings_nft ON nft_listings(nft_id);
CREATE INDEX idx_nft_listings_seller ON nft_listings(seller_account);
CREATE INDEX idx_nft_listings_status ON nft_listings(status);
CREATE INDEX idx_nft_listings_auction ON nft_listings(auction_end_time);

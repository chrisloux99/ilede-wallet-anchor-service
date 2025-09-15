CREATE TABLE nft_bids (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT REFERENCES nft_listings(id),
  bidder_account TEXT NOT NULL,
  bid_amount DECIMAL(20, 7) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'outbid', 'won', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nft_bids_listing ON nft_bids(listing_id);
CREATE INDEX idx_nft_bids_bidder ON nft_bids(bidder_account);
CREATE INDEX idx_nft_bids_status ON nft_bids(status);
CREATE INDEX idx_nft_bids_amount ON nft_bids(bid_amount DESC);

import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, ValidationError } from "../common/errors";
import { rateLimits } from "../common/rateLimiting";
import { withTransaction } from "../common/transactions";
import { logger } from "../common/logging";
import { Server, Keypair, TransactionBuilder, Operation, Asset, Memo, MemoType } from "stellar-sdk";

/**
 * NFT Marketplace for iLede ecosystem
 * Supports creation, trading, and auction of NFTs
 */

interface CreateNFTRequest {
  creator_account: string;
  name: string;
  description: string;
  image_url: string;
  metadata: Record<string, any>;
  collection_id?: string;
  royalties_percentage?: number; // 0-10%
}

interface CreateNFTResponse {
  nft_id: string;
  token_id: string;
  transaction_hash: string;
  success: boolean;
}

export const createNFT = api<CreateNFTRequest, CreateNFTResponse>(
  { expose: true, method: "POST", path: "/nft/create" },
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Validate input
        validate()
          .required("creator_account", req.creator_account)
          .stellarAccount("creator_account", req.creator_account)
          .required("name", req.name)
          .minLength("name", req.name, 1)
          .maxLength("name", req.name, 100)
          .required("description", req.description)
          .maxLength("description", req.description, 1000)
          .required("image_url", req.image_url)
          .url("image_url", req.image_url)
          .validate();

        // Validate royalties (0-10%)
        if (req.royalties_percentage && (req.royalties_percentage < 0 || req.royalties_percentage > 10)) {
          throw new ValidationError("Invalid royalties percentage", {
            royalties_percentage: "Must be between 0% and 10%"
          });
        }

        logger.info("Creating NFT", {
          creator_account: req.creator_account,
          name: req.name,
          collection_id: req.collection_id
        });

        // Generate unique token ID
        const tokenId = `nft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create NFT record
        const nftResult = await tx.queryRow`
          INSERT INTO nfts (
            token_id, creator_account, name, description, image_url, 
            metadata, collection_id, royalties_percentage, status
          )
          VALUES (
            ${tokenId}, ${req.creator_account}, ${req.name}, ${req.description}, 
            ${req.image_url}, ${JSON.stringify(req.metadata)}, ${req.collection_id || null},
            ${req.royalties_percentage || 0}, 'created'
          )
          RETURNING id
        `;

        // Record transaction
        await tx.exec`
          INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
          VALUES (${req.creator_account}, 'nft_create', 'NFT', '1', 'completed')
        `;

        logger.info("NFT created successfully", {
          nft_id: nftResult!.id,
          token_id: tokenId,
          creator_account: req.creator_account
        });

        return {
          nft_id: nftResult!.id.toString(),
          token_id: tokenId,
          transaction_hash: "nft_" + nftResult!.id, // Placeholder
          success: true
        };

      } catch (error: any) {
        logger.error("NFT creation failed", error, {
          creator_account: req.creator_account,
          name: req.name
        });
        
        if (error.code) {
          throw error;
        }
        handleDatabaseError(error);
      }
    });
  })
);

interface ListNFTRequest {
  seller_account: string;
  nft_id: string;
  price: string;
  currency: string; // iLede, USDC, XLM
  auction_end_time?: string; // ISO timestamp for auction
  minimum_bid?: string;
}

interface ListNFTResponse {
  listing_id: string;
  transaction_hash: string;
  success: boolean;
}

export const listNFT = api<ListNFTRequest, ListNFTResponse>(
  { expose: true, method: "POST", path: "/nft/list" },
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Validate input
        validate()
          .required("seller_account", req.seller_account)
          .stellarAccount("seller_account", req.seller_account)
          .required("nft_id", req.nft_id)
          .required("price", req.price)
          .amount("price", req.price)
          .required("currency", req.currency)
          .assetCode("currency", req.currency)
          .validate();

        // Validate currency
        const validCurrencies = ['iLede', 'USDC', 'XLM'];
        if (!validCurrencies.includes(req.currency)) {
          throw new ValidationError("Invalid currency", {
            currency: `Must be one of: ${validCurrencies.join(', ')}`
          });
        }

        logger.info("Listing NFT for sale", {
          seller_account: req.seller_account,
          nft_id: req.nft_id,
          price: req.price,
          currency: req.currency
        });

        // Verify NFT exists and belongs to seller
        const nft = await tx.queryRow`
          SELECT * FROM nfts WHERE id = ${req.nft_id} AND creator_account = ${req.seller_account}
        `;

        if (!nft) {
          throw new ValidationError("NFT not found or not owned by seller", {
            nft_id: "Invalid NFT ID or ownership"
          });
        }

        // Create listing record
        const listingResult = await tx.queryRow`
          INSERT INTO nft_listings (
            nft_id, seller_account, price, currency, auction_end_time, 
            minimum_bid, status, created_at
          )
          VALUES (
            ${req.nft_id}, ${req.seller_account}, ${req.price}, ${req.currency},
            ${req.auction_end_time || null}, ${req.minimum_bid || null}, 'active', NOW()
          )
          RETURNING id
        `;

        // Update NFT status
        await tx.exec`
          UPDATE nfts SET status = 'listed' WHERE id = ${req.nft_id}
        `;

        // Record transaction
        await tx.exec`
          INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
          VALUES (${req.seller_account}, 'nft_list', ${req.currency}, ${req.price}, 'completed')
        `;

        logger.info("NFT listed successfully", {
          listing_id: listingResult!.id,
          nft_id: req.nft_id,
          price: req.price,
          currency: req.currency
        });

        return {
          listing_id: listingResult!.id.toString(),
          transaction_hash: "listing_" + listingResult!.id, // Placeholder
          success: true
        };

      } catch (error: any) {
        logger.error("NFT listing failed", error, {
          seller_account: req.seller_account,
          nft_id: req.nft_id
        });
        
        if (error.code) {
          throw error;
        }
        handleDatabaseError(error);
      }
    });
  })
);

interface BuyNFTRequest {
  buyer_account: string;
  listing_id: string;
  bid_amount?: string; // For auctions
}

interface BuyNFTResponse {
  purchase_id: string;
  transaction_hash: string;
  success: boolean;
}

export const buyNFT = api<BuyNFTRequest, BuyNFTResponse>(
  { expose: true, method: "POST", path: "/nft/buy" },
  rateLimits.transactions(async (req) => {
    return withTransaction(async (tx) => {
      try {
        // Validate input
        validate()
          .required("buyer_account", req.buyer_account)
          .stellarAccount("buyer_account", req.buyer_account)
          .required("listing_id", req.listing_id)
          .validate();

        logger.info("Processing NFT purchase", {
          buyer_account: req.buyer_account,
          listing_id: req.listing_id,
          bid_amount: req.bid_amount
        });

        // Get listing details
        const listing = await tx.queryRow`
          SELECT l.*, n.* FROM nft_listings l
          JOIN nfts n ON l.nft_id = n.id
          WHERE l.id = ${req.listing_id} AND l.status = 'active'
        `;

        if (!listing) {
          throw new ValidationError("Listing not found or inactive", {
            listing_id: "Invalid listing ID"
          });
        }

        // Check if it's an auction
        const isAuction = listing.auction_end_time && new Date(listing.auction_end_time) > new Date();
        
        if (isAuction) {
          // Handle auction bid
          if (!req.bid_amount) {
            throw new ValidationError("Bid amount required for auction", {
              bid_amount: "Required for auction listings"
            });
          }

          const bidAmount = parseFloat(req.bid_amount);
          const currentPrice = parseFloat(listing.price);
          const minimumBid = parseFloat(listing.minimum_bid || '0');

          if (bidAmount < Math.max(currentPrice, minimumBid)) {
            throw new ValidationError("Bid too low", {
              bid_amount: `Must be at least ${Math.max(currentPrice, minimumBid)}`
            });
          }

          // Create bid record
          const bidResult = await tx.queryRow`
            INSERT INTO nft_bids (listing_id, bidder_account, bid_amount, status, created_at)
            VALUES (${req.listing_id}, ${req.buyer_account}, ${req.bid_amount}, 'active', NOW())
            RETURNING id
          `;

          // Update listing with new highest bid
          await tx.exec`
            UPDATE nft_listings SET price = ${req.bid_amount} WHERE id = ${req.listing_id}
          `;

          logger.info("Auction bid placed", {
            bid_id: bidResult!.id,
            listing_id: req.listing_id,
            bid_amount: req.bid_amount
          });

          return {
            purchase_id: bidResult!.id.toString(),
            transaction_hash: "bid_" + bidResult!.id,
            success: true
          };

        } else {
          // Handle direct purchase
          const purchasePrice = parseFloat(listing.price);

          // Create purchase record
          const purchaseResult = await tx.queryRow`
            INSERT INTO nft_purchases (
              listing_id, buyer_account, seller_account, nft_id, 
              purchase_price, currency, status, created_at
            )
            VALUES (
              ${req.listing_id}, ${req.buyer_account}, ${listing.seller_account}, 
              ${listing.nft_id}, ${listing.price}, ${listing.currency}, 'completed', NOW()
            )
            RETURNING id
          `;

          // Update listing status
          await tx.exec`
            UPDATE nft_listings SET status = 'sold' WHERE id = ${req.listing_id}
          `;

          // Update NFT ownership
          await tx.exec`
            UPDATE nfts SET creator_account = ${req.buyer_account}, status = 'owned' WHERE id = ${listing.nft_id}
          `;

          // Record transaction
          await tx.exec`
            INSERT INTO transactions (stellar_account_id, transaction_type, asset_code, amount, status)
            VALUES (${req.buyer_account}, 'nft_purchase', ${listing.currency}, ${listing.price}, 'completed')
          `;

          logger.info("NFT purchased successfully", {
            purchase_id: purchaseResult!.id,
            nft_id: listing.nft_id,
            buyer_account: req.buyer_account,
            purchase_price: listing.price
          });

          return {
            purchase_id: purchaseResult!.id.toString(),
            transaction_hash: "purchase_" + purchaseResult!.id,
            success: true
          };
        }

      } catch (error: any) {
        logger.error("NFT purchase failed", error, {
          buyer_account: req.buyer_account,
          listing_id: req.listing_id
        });
        
        if (error.code) {
          throw error;
        }
        handleDatabaseError(error);
      }
    });
  })
);

interface GetNFTMarketplaceResponse {
  total_nfts: number;
  active_listings: number;
  total_volume: string;
  top_collections: Array<{
    collection_id: string;
    name: string;
    volume: string;
    floor_price: string;
  }>;
  recent_sales: Array<{
    nft_id: string;
    name: string;
    price: string;
    currency: string;
    buyer: string;
    timestamp: string;
  }>;
}

export const getMarketplace = api<{}, GetNFTMarketplaceResponse>(
  { expose: true, method: "GET", path: "/nft/marketplace" },
  async () => {
    try {
      // Get marketplace statistics
      const stats = await anchorDB.queryRow`
        SELECT 
          COUNT(DISTINCT n.id) as total_nfts,
          COUNT(DISTINCT l.id) as active_listings,
          COALESCE(SUM(CAST(p.purchase_price AS DECIMAL)), 0) as total_volume
        FROM nfts n
        LEFT JOIN nft_listings l ON n.id = l.nft_id AND l.status = 'active'
        LEFT JOIN nft_purchases p ON n.id = p.nft_id AND p.status = 'completed'
      `;

      // Get top collections
      const topCollections = await anchorDB.query`
        SELECT 
          n.collection_id,
          COUNT(*) as nft_count,
          COALESCE(SUM(CAST(p.purchase_price AS DECIMAL)), 0) as volume,
          MIN(CAST(l.price AS DECIMAL)) as floor_price
        FROM nfts n
        LEFT JOIN nft_purchases p ON n.id = p.nft_id AND p.status = 'completed'
        LEFT JOIN nft_listings l ON n.id = l.nft_id AND l.status = 'active'
        WHERE n.collection_id IS NOT NULL
        GROUP BY n.collection_id
        ORDER BY volume DESC
        LIMIT 10
      `;

      // Get recent sales
      const recentSales = await anchorDB.query`
        SELECT 
          p.nft_id,
          n.name,
          p.purchase_price as price,
          p.currency,
          p.buyer_account as buyer,
          p.created_at as timestamp
        FROM nft_purchases p
        JOIN nfts n ON p.nft_id = n.id
        WHERE p.status = 'completed'
        ORDER BY p.created_at DESC
        LIMIT 10
      `;

      return {
        total_nfts: parseInt(stats?.total_nfts || '0'),
        active_listings: parseInt(stats?.active_listings || '0'),
        total_volume: (stats?.total_volume || '0').toString(),
        top_collections: topCollections.map((col: any) => ({
          collection_id: col.collection_id,
          name: `Collection ${col.collection_id}`,
          volume: col.volume.toString(),
          floor_price: col.floor_price?.toString() || '0'
        })),
        recent_sales: recentSales.map((sale: any) => ({
          nft_id: sale.nft_id.toString(),
          name: sale.name,
          price: sale.price,
          currency: sale.currency,
          buyer: sale.buyer,
          timestamp: sale.timestamp
        }))
      };

    } catch (error: any) {
      logger.error("Failed to get marketplace data", error);
      handleDatabaseError(error);
    }
  }
);

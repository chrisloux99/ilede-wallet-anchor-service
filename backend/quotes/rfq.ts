import { api } from "encore.dev/api";
import { anchorDB } from "../database/db";
import { randomBytes } from "crypto";

interface RfqRequest {
  sell_asset: string;
  buy_asset: string;
  sell_amount?: string;
  buy_amount?: string;
  expire_after?: string;
  country_code?: string;
}

interface RfqResponse {
  id: string;
  expires_at: string;
  price: string;
  total_price: string;
  sell_asset: string;
  buy_asset: string;
  sell_amount: string;
  buy_amount: string;
  fee: {
    total: string;
    asset: string;
  };
}

// Creates a Request for Quote (SEP-38)
export const rfq = api<RfqRequest, RfqResponse>(
  { expose: true, method: "POST", path: "/quote" },
  async (req) => {
    const quoteId = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Simple exchange rate calculation (in reality, this would use real market data)
    let sellAmount = req.sell_amount ? parseFloat(req.sell_amount) : 0;
    let buyAmount = req.buy_amount ? parseFloat(req.buy_amount) : 0;
    
    // Mock exchange rates
    const exchangeRates: { [key: string]: number } = {
      "iLede:USDC": 0.5,
      "USDC:iLede": 2.0,
      "iLede:USD": 0.5,
      "USD:iLede": 2.0
    };
    
    const pair = `${req.sell_asset}:${req.buy_asset}`;
    const rate = exchangeRates[pair] || 1.0;
    
    if (sellAmount > 0) {
      buyAmount = sellAmount * rate;
    } else if (buyAmount > 0) {
      sellAmount = buyAmount / rate;
    }
    
    const fee = sellAmount * 0.001; // 0.1% fee
    const totalPrice = (sellAmount + fee).toString();
    
    // Store quote in database
    await anchorDB.exec`
      INSERT INTO quotes (quote_id, sell_asset, buy_asset, sell_amount, buy_amount, fee, expires_at)
      VALUES (${quoteId}, ${req.sell_asset}, ${req.buy_asset}, ${sellAmount}, ${buyAmount}, ${fee}, ${expiresAt})
    `;
    
    return {
      id: quoteId,
      expires_at: expiresAt.toISOString(),
      price: rate.toString(),
      total_price: totalPrice,
      sell_asset: req.sell_asset,
      buy_asset: req.buy_asset,
      sell_amount: sellAmount.toString(),
      buy_amount: buyAmount.toString(),
      fee: {
        total: fee.toString(),
        asset: req.sell_asset
      }
    };
  }
);

import { api, APIError } from "encore.dev/api";
import { anchorDB } from "../database/db";

interface TransactionRequest {
  id: string;
}

interface TransactionResponse {
  id: string;
  kind: string;
  status: string;
  status_eta?: number;
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  started_at: string;
  completed_at?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  message?: string;
}

// Retrieves transaction status (SEP-6)
export const transaction = api<TransactionRequest, TransactionResponse>(
  { expose: true, method: "GET", path: "/transaction/:id" },
  async (req) => {
    const transaction = await anchorDB.queryRow`
      SELECT * FROM transactions WHERE id = ${req.id}
    `;
    
    if (!transaction) {
      throw APIError.notFound("Transaction not found");
    }
    
    return {
      id: transaction.id.toString(),
      kind: transaction.transaction_type,
      status: transaction.status,
      status_eta: transaction.status === 'pending' ? 300 : undefined,
      amount_in: transaction.amount,
      started_at: transaction.created_at.toISOString(),
      completed_at: transaction.status === 'completed' ? transaction.updated_at.toISOString() : undefined,
      stellar_transaction_id: transaction.transaction_hash,
      external_transaction_id: transaction.external_transaction_id,
      message: transaction.memo
    };
  }
);

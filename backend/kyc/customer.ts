import { api, APIError } from "encore.dev/api";
import { anchorDB } from "../database/db";

interface CustomerRequest {
  account: string;
  memo?: string;
  memo_type?: string;
}

interface CustomerResponse {
  status: string;
  fields?: any;
  provided_fields?: any;
  message?: string;
}

// Retrieves customer information and KYC status (SEP-12)
export const customer = api<CustomerRequest, CustomerResponse>(
  { expose: true, method: "GET", path: "/customer" },
  async (req) => {
    const user = await anchorDB.queryRow`
      SELECT kyc_status, kyc_data FROM users WHERE stellar_account_id = ${req.account}
    `;
    
    if (!user) {
      throw APIError.notFound("Customer not found");
    }
    
    const response: CustomerResponse = {
      status: user.kyc_status,
    };
    
    if (user.kyc_status === 'pending') {
      response.fields = {
        first_name: {
          description: "First name",
          type: "string",
          status: "not_provided"
        },
        last_name: {
          description: "Last name", 
          type: "string",
          status: "not_provided"
        },
        email_address: {
          description: "Email address",
          type: "string",
          status: "not_provided"
        }
      };
      response.message = "Please provide your personal information for KYC verification";
    }
    
    return response;
  }
);

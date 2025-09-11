import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { anchorDB } from "../database/db";
import { validate } from "../common/validation";
import { handleDatabaseError, NotFoundError } from "../common/errors";

// KYC Provider Configuration
const kycProviderApiKey = secret("KycProviderApiKey");

interface SubmitKycRequest {
  account: string;
  first_name?: string;
  last_name?: string;
  email_address?: string;
  phone_number?: string;
  id_type?: string;
  id_country_code?: string;
  id_issue_date?: string;
  id_expiration_date?: string;
  id_number?: string;
}

interface SubmitKycResponse {
  id: string;
  status: string;
  message?: string;
}

// Submits customer KYC information (SEP-12)
export const submit = api<SubmitKycRequest, SubmitKycResponse>(
  { expose: true, method: "PUT", path: "/customer" },
  async (req) => {
    try {
      // Validate input
      validate()
        .required("account", req.account)
        .stellarAccount("account", req.account)
        .email("email_address", req.email_address)
        .phone("phone_number", req.phone_number)
        .minLength("first_name", req.first_name, 1)
        .minLength("last_name", req.last_name, 1)
        .maxLength("first_name", req.first_name, 50)
        .maxLength("last_name", req.last_name, 50)
        .maxLength("id_number", req.id_number, 50)
        .validate();

      // Validate ID type if provided
      if (req.id_type && !["passport", "drivers_license", "national_id", "other"].includes(req.id_type)) {
        throw new ValidationError("Invalid ID type", {
          id_type: "Must be one of: passport, drivers_license, national_id, other"
        });
      }

      // Validate country code format if provided
      if (req.id_country_code && !/^[A-Z]{2}$/.test(req.id_country_code)) {
        throw new ValidationError("Invalid country code", {
          id_country_code: "Must be a valid 2-letter ISO country code"
        });
      }

      // Check if user exists
      const existingUser = await anchorDB.query`
        SELECT id FROM users WHERE stellar_account_id = ${req.account}
      `;
      
      if (existingUser.length === 0) {
        throw new NotFoundError("User account");
      }

      // Store KYC data
      const kycData = {
        first_name: req.first_name,
        last_name: req.last_name,
        email_address: req.email_address,
        phone_number: req.phone_number,
        id_type: req.id_type,
        id_country_code: req.id_country_code,
        id_issue_date: req.id_issue_date,
        id_expiration_date: req.id_expiration_date,
        id_number: req.id_number
      };
      
      // Update user KYC status
      await anchorDB.exec`
        UPDATE users 
        SET kyc_status = 'in_review', kyc_data = ${JSON.stringify(kycData)}, updated_at = NOW()
        WHERE stellar_account_id = ${req.account}
      `;
      
      // Create KYC request record
      const result = await anchorDB.queryRow`
        INSERT INTO kyc_requests (user_id, request_type, status, submitted_data)
        SELECT id, 'individual', 'in_review', ${JSON.stringify(kycData)}
        FROM users WHERE stellar_account_id = ${req.account}
        RETURNING id
      `;
      
      return {
        id: result!.id.toString(),
        status: "in_review",
        message: "Your KYC information has been submitted for review"
      };
    } catch (error: any) {
      if (error.code) {
        throw error; // Re-throw our custom errors
      }
      handleDatabaseError(error);
    }
  }
);

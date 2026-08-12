import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { validate, sanitizeInput } from '@/lib/validation';
import { errorToResponse, UnauthorizedError, NotFoundError } from '@/lib/errors';
import { verifyJwt } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const account = searchParams.get('account') || '';

    // Auth check - users can only view their own KYC
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload || tokenPayload.sub !== account) {
      throw new UnauthorizedError('Authentication required. You can only view your own KYC status.');
    }

    validate().required('account', account).stellarAccount('account', account).validate();

    const result = await pool.query(
      `SELECT kyc_status, first_name, last_name, email, phone_number, id_type, id_country_code
       FROM users WHERE stellar_account_id = $1`,
      [account]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ status: 'not_found', message: 'Customer not found' });
    }

    const user = result.rows[0];
    return NextResponse.json({
      status: user.kyc_status,
      fields: {
        first_name: { value: user.first_name },
        last_name: { value: user.last_name },
        email_address: { value: user.email },
        phone_number: { value: user.phone_number },
        id_type: { value: user.id_type },
        id_country_code: { value: user.id_country_code },
      },
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = sanitizeInput(await request.json());
    const { account, first_name, last_name, email_address, phone_number, id_type, id_country_code, id_number } = body;
    const email = email_address;

    // Auth check
    const authHeader = request.headers.get('authorization');
    const tokenPayload = verifyJwt(authHeader?.replace('Bearer ', '') || '');
    if (!tokenPayload || tokenPayload.sub !== account) {
      throw new UnauthorizedError('Authentication required.');
    }

    validate()
      .required('account', account)
      .stellarAccount('account', account)
      .required('first_name', first_name)
      .required('last_name', last_name)
      .validate();

    // Upsert: create user if not exists, update KYC fields
    const result = await pool.query(
      `INSERT INTO users (stellar_account_id, kyc_status, first_name, last_name, email, phone_number, id_type, id_country_code, id_number)
       VALUES ($1, 'submitted', $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (stellar_account_id) DO UPDATE SET
         kyc_status = 'submitted',
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         email = EXCLUDED.email,
         phone_number = EXCLUDED.phone_number,
         id_type = EXCLUDED.id_type,
         id_country_code = EXCLUDED.id_country_code,
         id_number = EXCLUDED.id_number,
         updated_at = NOW()
       RETURNING id`,
      [account, first_name, last_name, email || null, phone_number || null, id_type || null, id_country_code || null, id_number || null]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Customer');
    }

    return NextResponse.json({
      id: account,
      status: 'submitted',
      message: 'KYC information submitted for review',
    });
  } catch (error) {
    return errorToResponse(error);
  }
}

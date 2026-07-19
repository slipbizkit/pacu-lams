import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

// Synthetic seed credentials only — never real personnel data. Email is the login
// identifier (see migration 021). Change the password immediately after first login;
// must_change_password forces that on the very first sign-in.
const ADMIN_EMAIL = 'admin@pacu.local';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function seed() {
  const existing = await sql`SELECT user_id FROM users WHERE email = ${ADMIN_EMAIL}`;
  if (existing.length) {
    console.log('Admin user already exists, skipping.');
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await sql`
    INSERT INTO users (email, password_hash, first_name, last_name, position, role, must_change_password)
    VALUES (${ADMIN_EMAIL}, ${hash}, 'System', 'Administrator', 'PACU Administrator', 'admin', TRUE)
  `;

  console.log(`Seeded admin user "${ADMIN_EMAIL}" with password "${ADMIN_PASSWORD}".`);
  console.log('Sign in with this email; you will be prompted to change the password and set up 2FA.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

// Synthetic seed credentials only — never real personnel data. Change the password
// immediately after first login in a real deployment.
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'ChangeMe123!';

async function seed() {
  const existing = await sql`SELECT user_id FROM users WHERE username = ${ADMIN_USERNAME}`;
  if (existing.length) {
    console.log('Admin user already exists, skipping.');
    return;
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await sql`
    INSERT INTO users (username, password_hash, first_name, last_name, position, role)
    VALUES (${ADMIN_USERNAME}, ${hash}, 'System', 'Administrator', 'PACU Administrator', 'admin')
  `;

  console.log(`Seeded admin user "${ADMIN_USERNAME}" with password "${ADMIN_PASSWORD}".`);
  console.log('Change this password after first login.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

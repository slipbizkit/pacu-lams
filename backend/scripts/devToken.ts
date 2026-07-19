// dotenv MUST load before any module that reads env at import time (db.ts throws
// on a missing DATABASE_URL; jwt.ts reads JWT_SECRET). Keep this import first.
import 'dotenv/config';
import sql from '../src/db';
import { signAccessToken } from '../src/utils/jwt';
import { upsertSession } from '../src/services/authService';
import { User } from '../src/types/user';

/**
 * DEV / LOCAL TESTING ONLY — mint a valid session for an existing staff account so
 * automated or manual testing can reach authenticated pages without going through
 * the login form + TOTP 2FA.
 *
 * Why this is safe:
 *   - It reuses the app's own signAccessToken() + upsertSession(), so the token and
 *     the user_sessions row are byte-for-byte what a real login would create.
 *   - It requires JWT_SECRET and DATABASE_URL — the same secrets the server itself
 *     holds. Anyone who can run this already has server-level trust.
 *   - It changes NO application/runtime code. There is no bypass path shipped to
 *     production and the real login/2FA is untouched. Never point it at prod data.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/devToken.ts                 # first active admin
 *   npx ts-node scripts/devToken.ts --role lawyer   # first active user of a role
 *   npx ts-node scripts/devToken.ts --email a@b.com # a specific account
 *   npx ts-node scripts/devToken.ts --id 5          # a specific user_id
 */

function parseArgs(argv: string[]): { email?: string; id?: number; role?: string } {
  const out: { email?: string; id?: number; role?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--email') out.email = argv[++i];
    else if (a === '--id') out.id = Number(argv[++i]);
    else if (a === '--role') out.role = argv[++i];
  }
  return out;
}

async function findUser(args: { email?: string; id?: number; role?: string }): Promise<User | null> {
  if (args.id != null && Number.isInteger(args.id)) {
    const rows = await sql`SELECT * FROM users WHERE user_id = ${args.id} AND is_active = TRUE`;
    return (rows[0] as User) ?? null;
  }
  if (args.email) {
    const rows = await sql`SELECT * FROM users WHERE email = ${args.email.toLowerCase()} AND is_active = TRUE`;
    return (rows[0] as User) ?? null;
  }
  const role = args.role ?? 'admin';
  const rows = await sql`
    SELECT * FROM users WHERE role = ${role} AND is_active = TRUE
    ORDER BY user_id ASC LIMIT 1
  `;
  return (rows[0] as User) ?? null;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run with NODE_ENV=production. This is a local testing helper.');
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const user = await findUser(args);
  if (!user) {
    console.error('No matching active user found. Pass --email, --id, or --role, or seed an admin first.');
    process.exit(1);
  }

  // Same call the login/2FA controllers make on success — mints the token and
  // registers its jti so requireAuth's single-session check passes.
  const { token, jti } = signAccessToken(user);
  await upsertSession(user.user_id, jti);

  const expires = new Date(Date.now() + 60 * 60 * 1000).toLocaleString();

  console.log('\n─ Dev session minted (valid ~60 min, until ' + expires + ') ─');
  console.log(`  user_id : ${user.user_id}`);
  console.log(`  name    : ${user.first_name} ${user.last_name}`);
  console.log(`  email   : ${user.email}`);
  console.log(`  role    : ${user.role}`);
  console.log('\n─ Browser (paste in the app tab DevTools console, then reload) ─');
  console.log(`  localStorage.setItem('token', '${token}'); location.reload();`);
  console.log('\n─ API testing (Authorization header) ─');
  console.log(`  curl -H "Authorization: Bearer ${token}" <API_URL>/clients/dashboard`);
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

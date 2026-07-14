import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import userRoutes from './routes/users';
import lookupRoutes from './routes/lookups';
import reportRoutes from './routes/reports';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Vercel terminates TLS and proxies to this app, so the socket peer is Vercel's
// edge — not the client. Without this, `req.ip` is the proxy's address for every
// request, which would collapse all rate-limit keys into a single shared bucket and
// let one user's failed logins lock out everyone. Trust exactly one hop: trusting
// more would let a client forge X-Forwarded-For and evade the limiter entirely.
app.set('trust proxy', 1);

// In production, lock CORS to the configured frontend origin. In development,
// allow any localhost origin so multiple dev frontends (different Vite ports,
// e.g. several concurrent sessions) can reach the API without reconfiguring.
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : (origin, cb) => cb(null, !origin || /^http:\/\/localhost:\d+$/.test(origin) || origin === process.env.FRONTEND_URL),
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/clients', clientRoutes);
app.use('/users', userRoutes);
app.use('/lookups', lookupRoutes);
app.use('/reports', reportRoutes);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT ?? 3000;
  app.listen(port, () => console.log(`Server running on :${port}`));
}

export default app;

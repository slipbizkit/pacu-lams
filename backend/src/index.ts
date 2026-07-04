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

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
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

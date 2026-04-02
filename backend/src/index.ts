import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDb } from './database/db';
import expenseRoutes from './routes/expenses';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

getDb();

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/expenses', expenseRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
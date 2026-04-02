import cors from 'cors';
import express from 'express';
import expenseRoutes from './routes/expenses';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_request, response) => {
    response.json({ success: true, status: 'ok' });
  });

  app.use('/api/expenses', expenseRoutes);

  return app;
}

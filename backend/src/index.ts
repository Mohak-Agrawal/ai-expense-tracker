import dotenv from 'dotenv';
import { createApp } from './app';
import { getDb } from './database/db';

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

getDb();

app.listen(Number(PORT), HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));
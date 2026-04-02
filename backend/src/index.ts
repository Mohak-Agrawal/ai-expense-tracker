import dotenv from 'dotenv';
import { createApp } from './app';
import { getDb } from './database/db';

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3000;

getDb();

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
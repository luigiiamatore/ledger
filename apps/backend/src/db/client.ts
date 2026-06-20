import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

const dbFile = process.env.DATABASE_URL || 'sqlite.db';

const sqlite = new Database(dbFile);
export const db = drizzle(sqlite, { schema });

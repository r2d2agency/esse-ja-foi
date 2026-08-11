import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const client = postgres(connectionString, { 
  max: 1,
  ssl: connectionString.includes('sslmode=disable') ? false : 'require',
  connect_timeout: 10,
});
export const db = drizzle(client, { schema });

// Auto-migration on initialization
export const migrateDb = async () => {
  console.log('Running migrations...');
  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

// In production, we trigger migrations when the module loads
if (process.env['NODE_ENV'] === 'production') {
  migrateDb().catch(console.error);
}


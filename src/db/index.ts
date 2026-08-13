import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';

// Note: DATABASE_URL must be available as a server-side environment variable.
const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL não definida.');
}

const getClient = () => {
  const conn = process.env['DATABASE_URL'];
  if (!conn) return null;
  return postgres(conn, { 
    max: 10,
    ssl: conn.includes('sslmode=disable') ? false : 'require',
    connect_timeout: 30,
  });
};

export const client = getClient();
export const db = client ? drizzle(client, { schema }) : null;

export const migrateDb = async () => {
  if (!db) {
    console.error('❌ Migração impossível: DATABASE_URL ausente.');
    return;
  }
  
  if (process.env['SKIP_MIGRATIONS'] === 'true') return;
  
  // console.log('🚀 Iniciando migrações...');
  try {
    const migrationsPath = path.join(process.cwd(), 'drizzle');
    await migrate(db, { migrationsFolder: migrationsPath });
    // console.log('✅ Migrações concluídas.');

    const { ensureSuperAdmin } = await import('./auth.server');
    await ensureSuperAdmin();
    
    const { seedConfiguracoes, ensureLaudoSchema } = await import('./laudos.server');
    await ensureLaudoSchema();
    await seedConfiguracoes();
  } catch (error) {
    console.error('❌ Falha na migração:', error);
  }
};

// Log de inicialização para debug no Easypanel
// console.log('🌐 Servidor iniciando...');
// console.log('📍 NODE_ENV:', process.env['NODE_ENV']);
// console.log('📍 PORT:', process.env['PORT']);
// console.log('📍 DATABASE_URL presente:', !!connectionString);
if (connectionString) {
  const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
  // console.log('📍 DATABASE_URL (masked):', masked);
}




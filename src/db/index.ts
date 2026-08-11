import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  console.warn('⚠️ DATABASE_URL não definida. O banco de dados não será conectado até que a variável seja configurada.');
}

// Criamos o cliente apenas se a string existir, para evitar erro de inicialização fatal
const client = connectionString 
  ? postgres(connectionString, { 
      max: 10,
      ssl: connectionString.includes('sslmode=disable') ? false : 'require',
      connect_timeout: 30,
    }) 

  : null;

export const db = client ? drizzle(client, { schema }) : null;

export const migrateDb = async () => {
  if (!db) {
    console.error('❌ Migração impossível: DATABASE_URL ausente.');
    return;
  }
  
  if (process.env['SKIP_MIGRATIONS'] === 'true') return;
  
  console.log('🚀 Iniciando migrações...');
  try {
    const migrationsPath = path.join(process.cwd(), 'drizzle');
    await migrate(db, { migrationsFolder: migrationsPath });
    console.log('✅ Migrações concluídas.');

    const { ensureSuperAdmin } = await import('./auth.server');
    await ensureSuperAdmin();
  } catch (error) {
    console.error('❌ Falha na migração:', error);
  }
};

// Log de inicialização para debug no Easypanel
console.log('🌐 Servidor iniciando...');
console.log('📍 NODE_ENV:', process.env['NODE_ENV']);
console.log('📍 PORT:', process.env['PORT']);
console.log('📍 DATABASE_URL presente:', !!connectionString);
if (connectionString) {
  const masked = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log('📍 DATABASE_URL (masked):', masked);
}




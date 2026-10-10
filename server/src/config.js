// Reads settings from environment variables (server/.env in development).
import 'dotenv/config';

function list(value, fallback) {
  return (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  clientOrigins: list(process.env.CLIENT_ORIGIN, 'http://localhost:5173'),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: process.env.DATABASE_SSL !== 'false',
  databaseCaCert: process.env.DATABASE_CA_CERT || '',
};

export const isProduction = config.env === 'production';

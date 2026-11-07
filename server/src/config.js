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
  // Address of the website, used for links inside e-mails.
  appUrl: (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, ''),

  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl: process.env.DATABASE_SSL !== 'false',
  databaseCaCert: process.env.DATABASE_CA_CERT || '',

  jwtSecret: process.env.JWT_SECRET || '',
  sessionDays: 7,

  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'Sulyap <no-reply@sulyap.site>',
  },

  // Shared secret for an outside scheduler to trigger background jobs (e.g. Supabase Cron).
  cronSecret: process.env.CRON_SECRET || '',
  // Development shortcut: log in as a seeded account without its password. Never in production.
  enableDevLogin: process.env.ENABLE_DEV_LOGIN === 'true',
};

export const isProduction = config.env === 'production';
export const devLoginEnabled = !isProduction && config.enableDevLogin;

if (isProduction && config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set (32+ characters) in production.');
}

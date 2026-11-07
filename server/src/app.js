import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config, isProduction } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { loadSession, requireRole } from './middleware/auth.js';
import { originCheck } from './middleware/originCheck.js';
import healthRouter from './routes/health.js';
import metaRouter from './routes/meta.js';
import authRouter from './routes/auth.js';
import accountRouter from './routes/account.js';
import destinationsRouter from './routes/destinations.js';
import nominationsRouter from './routes/nominations.js';
import officerRouter from './routes/officer.js';
import contributionsRouter from './routes/contributions.js';
import adminUsersRouter from './routes/admin/users.js';
import adminIdVerificationsRouter from './routes/admin/idVerifications.js';
import adminWorkflowRouter from './routes/admin/workflow.js';
import adminContentRouter from './routes/admin/content.js';
import internalRouter from './routes/internal.js';
import { newsletterRouter, notificationsRouter } from './routes/notifications.js';
import devRouter from './routes/dev.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render and Hostinger sit behind one proxy.
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(originCheck);
  app.use(loadSession);

  app.use('/api/health', healthRouter);
  app.use('/api', metaRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/destinations', destinationsRouter);
  app.use('/api/nominations', nominationsRouter);
  app.use('/api/officer', officerRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/newsletter', newsletterRouter);
  app.use('/api', contributionsRouter);
  app.use(
    '/api/admin',
    requireRole('administrator'),
    adminUsersRouter,
    adminWorkflowRouter,
    adminContentRouter,
  );
  app.use('/api/admin/id-verifications', requireRole('administrator'), adminIdVerificationsRouter);
  app.use('/api/internal', internalRouter);
  if (!isProduction) app.use('/api/dev', devRouter);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);
  return app;
}

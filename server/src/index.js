import { createApp } from './app.js';
import { config } from './config.js';
import { scheduleIdCleanup } from './jobs/idCleanup.js';

createApp().listen(config.port, () => {
  console.log(`Sulyap API listening on http://localhost:${config.port}`);
});
scheduleIdCleanup();

import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { createAppServer } from './app';
import { loadConfig } from './config';
import { openWaitlistStore } from './db';

if (existsSync('.env')) loadEnvFile('.env');

const config = loadConfig();
const store = openWaitlistStore(config.dbPath);
const server = createAppServer(config, store);

server.listen(config.port, config.host, () => {
  console.log(`ZunoBot site listening on http://${config.host}:${config.port}`);
  console.log(`Waitlist database: ${config.dbPath}`);
  if (config.tokenSecretIsEphemeral) {
    console.warn('WAITLIST_TOKEN_SECRET is not set: using a random secret for this process. Set it in production.');
  }
});

function shutdown(): void {
  server.close(() => {
    store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

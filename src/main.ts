import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import * as dotenv from 'dotenv';
import { fastifyMongodb } from '@fastify/mongodb';
import { AuthController } from './controllers/AuthController';
import fastifyCookie from '@fastify/cookie';
import { JWT } from './helpers/jwt';
import { UserController } from './controllers/UserController';
import { durationToSeconds } from './helpers/d2s';

dotenv.config();

export async function main(): Promise<void> {
  const app = fastify({ logger: true });

  const { pubKey, privKey } = await JWT.loadOrCreate();
  const { APP_HOST, APP_PORT, MONGO_URI, ENABLE_REGISTRATION, JWT_DURATION, SESSION_DURATION, DOMAIN } = process.env;

  if (!MONGO_URI) {
    console.error("MONGO_URI isn't set");
    return;
  }

  const cookieDomain = DOMAIN ?? 'localhost';
  const appHost = APP_HOST ?? '127.0.0.1';
  const appPort = Number.parseInt(APP_PORT ?? '8000');
  const enableRegistration = JSON.parse(ENABLE_REGISTRATION ?? 'true');
  const jwtDuration = durationToSeconds(JWT_DURATION ?? '10m');
  const sessionDuration = durationToSeconds(SESSION_DURATION ?? '1d');

  app.register(fastifyMongodb, { url: MONGO_URI, forceClose: true });
  app.register(fastifyCors, { origin: true, credentials: true });
  app.register(fastifyCookie);
  app.register(AuthController, {
    publicKey: pubKey,
    privateKey: privKey,
    enableRegistration,
    jwtDuration,
    sessionDuration,
    cookieDomain,
    prefix: '/api/v1/auth',
  });
  app.register(UserController, { publicKey: pubKey, prefix: '/api/v1/user' });

  app.all('/', (req, res) => {
    res.send({ hello: 'world' });
  });

  app.listen({ port: appPort, host: appHost }, (e) => {
    if (e) throw e;
  });
  const stop = (): void => {
    console.log();
    app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    stop();
  }); // CTRL+C
  process.on('SIGQUIT', () => {
    stop();
  }); // Keyboard quit
  process.on('SIGTERM', () => {
    stop();
  }); // `kill` command
}

main();

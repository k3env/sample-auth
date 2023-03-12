import fastify, { RouteShorthandOptions } from 'fastify';
import fastifyCors from '@fastify/cors';
import * as dotenv from 'dotenv';
import { fastifyMongodb } from '@fastify/mongodb';
import { User } from './models/User.model';
import { decodeToken, generateToken } from './helpers/jwt';
import { comparePasswords, hashPassword } from './helpers/passwords';
import { Session } from './models/Session.model';

dotenv.config();

export async function main(): Promise<void> {
  const app = fastify({ logger: true });
  app.register(fastifyMongodb, { url: process.env.MONGO_URI, forceClose: true });
  // app.register(fastifyRedis, { url: process.env.REDIS_URI });
  app.register(fastifyCors, { origin: '*' });

  app.all('/', (req, res) => {
    res.send({ hello: 'world' });
  });

  const userSchema: RouteShorthandOptions = {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  };
  const sessionSchema: RouteShorthandOptions = {
    schema: {
      headers: {
        type: 'object',
        required: ['Token'],
        properties: {
          Token: { type: 'string' },
        },
      },
    },
  };

  app.post('/register', userSchema, async function (req, res) {
    const users = this.mongo.db?.collection<User>('user');
    const body = req.body as User;
    if (users) {
      if (await users.findOne({ username: body.username })) {
        res.status(400).send({ error: 'User already exist' });
      } else {
        body.password = hashPassword(body.password);
        const rv = await users.insertOne(body);
        res.send(rv);
      }
    }
  });
  app.post('/login', userSchema, async function (req, res) {
    const body = req.body as User;
    const user = await this.mongo.db?.collection<User>('user').findOne({ username: body.username });
    if (user && comparePasswords(body.password, user.password)) {
      const token = generateToken(user.username);
      const session = await this.mongo.db
        ?.collection<Session>('session')
        .insertOne({ user: user._id, token: token, client: req.headers['user-agent'] ?? 'Unknown' });
      res.send({ user: user.username, token, session });
    } else {
      res.status(404).send({ error: "User not found or password doesn't match" });
    }
  });
  app.get('/sessions', sessionSchema, async function (req, res) {
    const { token } = req.headers;
    try {
      const data = decodeToken(token as string);
      const username = data.payload.sub;
      const user = await this.mongo.db?.collection<User>('user').findOne({ username: username });
      if (user) {
        const sessions = await this.mongo.db?.collection<Session>('session').find({ user: user._id }).toArray();
        res.send(sessions);
      } else {
        res.send({ error: 'user, associated with token not found' });
      }
    } catch (e) {
      res.status(500).send({ error: e });
    }
  });
  app.listen(
    { port: Number.parseInt(process.env.APP_PORT ?? '3000'), host: process.env.APP_HOST ?? '127.0.0.1' },
    (e) => {
      if (e) throw e;
    },
  );
}

main();

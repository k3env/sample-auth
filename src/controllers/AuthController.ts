import { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyTypeProviderDefault } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { JWT } from '../helpers/jwt';
import { hashPassword, comparePasswords } from '../helpers/passwords';
import { Session } from '../models/Session.model';
import { User } from '../models/User.model';
import * as crypto from 'crypto';
import { ObjectId } from '@fastify/mongodb';
import { exportJWK, KeyLike } from 'jose';

export type AuthControllerOpts = {
  publicKey: KeyLike;
  privateKey: KeyLike;
  enableRegistration: boolean;
  jwtDuration: number;
  sessionDuration: number;
  cookieDomain: string;
};

import { RouteShorthandOptions } from 'fastify';

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

export async function AuthController(
  app: FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse<IncomingMessage>,
    FastifyBaseLogger,
    FastifyTypeProviderDefault
  >,
  opts: AuthControllerOpts,
  done: (err?: Error) => void,
): Promise<void> {
  const users = app.mongo.db?.collection<User>('users');
  const sessions = app.mongo.db?.collection<Session>('sessions');
  const { publicKey, privateKey } = opts;
  if (users && sessions) {
    const count = await users.countDocuments();
    if (count === 0) {
      const password = crypto.randomBytes(12).toString('hex');
      console.log(`
      =======================================
      | No users found
      | Created one new
      | Login: admin
      | Password: ${password}
      =======================================
      `);
      users.insertOne({
        username: 'admin',
        password: hashPassword(password),
      });
    }
    app.post('/register', userSchema, async function (req, res) {
      if (opts.enableRegistration) {
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
      } else {
        res.status(500).send({ message: 'Registration disabled by Administrator' });
      }
    });
    app.post('/login', userSchema, async function (req, res) {
      const body = req.body as User;
      const { headers } = req;
      const user = await users.findOne({ username: body.username });
      if (user && comparePasswords(body.password, user.password)) {
        const token = await JWT.sign(user.username, privateKey);
        const refresh = crypto.randomBytes(32).toString('hex');
        const rndKey = crypto.randomBytes(128).toString('hex');
        const refreshSigned = crypto.createHmac('sha256', rndKey).update(refresh).digest().toString('base64url');
        const session = await sessions.insertOne({
          client: headers['user-agent'] ?? 'Unknown',
          user: user._id,
          token: `${rndKey}.${refresh}`,
        });
        bakeCookies(res, token, refreshSigned, session.insertedId.toHexString()).send({
          user: user.username,
          session: session.insertedId,
        });
      } else {
        res.status(404).send({ message: "User not found or password doesn't match" });
      }
    });
    app.post('/refresh', async (req, res) => {
      const { cookies, headers } = req;
      const { sessid, refresh } = cookies;
      if (!sessid) {
        res.status(401).send({ message: 'Unauthorized, Session id isnt set' });
        return;
      }
      if (!refresh) {
        res.status(401).send({ message: 'Unauthorized, Refresh token not found' });
        return;
      }
      const session = await sessions.findOne({ _id: new ObjectId(sessid) });
      if (!session) {
        res.status(403).send({ message: 'Forbidden, Session with supplied id not found' });
        return;
      }
      const [key, rToken] = session.token.split('.');
      const gsR = crypto.createHmac('sha256', key).update(rToken).digest().toString('base64url');
      if (gsR !== refresh) {
        res.status(403).send({ message: "Forbidden, session refresh token doesn't match supplied token" });
        return;
      }
      const user = await users.findOne({ _id: session.user });
      if (!user) {
        res.status(404).send({ message: 'User not found' });
        return;
      }
      const result = await sessions.findOneAndDelete({ _id: new ObjectId(sessid) });
      if (result.ok === 1) {
        const token = await JWT.sign(user.username, privateKey);
        const newRefresh = crypto.randomBytes(32).toString('hex');
        const rndKey = crypto.randomBytes(128).toString('hex');
        const refreshSigned = crypto.createHmac('sha256', rndKey).update(newRefresh).digest().toString('base64url');
        const newSession = await sessions.insertOne({
          client: headers['user-agent'] ?? 'Unknown',
          user: user._id,
          token: `${rndKey}.${newRefresh}`,
        });
        bakeCookies(res, token, refreshSigned, newSession.insertedId.toHexString()).send({
          user: user.username,
          session: newSession.insertedId,
        });
      } else {
        res.send();
      }
    });
    app.get('/jwk', async (req, res) => {
      res.send(await exportJWK(publicKey));
    });

    const bakeCookies = (res: FastifyReply, token: string, refresh: string, sessionId: string): FastifyReply => {
      return res
        .setCookie('token', token, {
          httpOnly: true,
          path: '/',
          domain: opts.cookieDomain,
          maxAge: opts.jwtDuration, // 20 min
          sameSite: 'none',
        })
        .setCookie('refresh', refresh, {
          httpOnly: true,
          path: '/',
          domain: opts.cookieDomain,
          maxAge: opts.sessionDuration, // 1 day
          sameSite: 'none',
        })
        .setCookie('sessid', sessionId, {
          httpOnly: false,
          path: '/',
          domain: opts.cookieDomain,
          maxAge: opts.sessionDuration, // 1 day
          sameSite: 'none',
        });
    };
    done();
  } else {
    done(new Error('Cannot get user collection'));
  }
}

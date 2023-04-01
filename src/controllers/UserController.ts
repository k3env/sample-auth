import { FastifyInstance, FastifyBaseLogger, FastifyTypeProviderDefault } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { KeyLike } from 'jose';
import { JWT } from '../helpers/jwt';
import { Session } from '../models/Session.model';
import { User } from '../models/User.model';

export type UserControllerOpts = {
  publicKey: KeyLike;
};

export async function UserController(
  app: FastifyInstance<
    Server,
    IncomingMessage,
    ServerResponse<IncomingMessage>,
    FastifyBaseLogger,
    FastifyTypeProviderDefault
  >,
  opts: UserControllerOpts,
  done: (err?: Error) => void,
): Promise<void> {
  const { publicKey } = opts;
  const users = app.mongo.db?.collection<User>('users');
  const sessions = app.mongo.db?.collection<Session>('sessions');

  if (users && sessions) {
    app.get('/me', async (req, res) => {
      const token = req.cookies['token'];
      if (token) {
        try {
          const decoded = await JWT.decode(token, publicKey);
          const user = await users.findOne({ username: decoded.payload.sub });
          if (!user) {
            res.status(404).send({ message: 'User not found' });
            return;
          }

          delete (user as Partial<User>).password;

          res.send({ ...user, code: 200, message: 'OK' });
        } catch (e) {
          res.status(500).send({ ...e });
        }
      } else {
        res.status(401).send({ code: 401, message: 'Unauthorized' });
      }
    });
    app.get('/sessions', async (req, res) => {
      const token = req.cookies['token'];
      if (token) {
        try {
          const decoded = await JWT.decode(token, publicKey);
          const user = await users.findOne({ username: decoded.payload.sub });
          if (!user) {
            res.status(404).send({ message: 'User not found' });
            return;
          }

          const userSessions = await sessions.find({ user: user._id }).toArray();

          res.send(userSessions);
        } catch (e) {
          res.status(500).send({ ...e });
        }
      } else {
        res.status(401).send({ code: 401, message: 'Unauthorized' });
      }
    });
    done();
  } else {
    done(new Error('Cant connect to Mongo'));
    return;
  }
}

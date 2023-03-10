import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { User } from '../models/User.model';

export class AuthController {
  protected app: FastifyInstance;
  constructor(app: FastifyInstance) {
    this.app = app;
  }

  public async register(req: FastifyRequest, res: FastifyReply): Promise<void> {
    const users = this.app.mongo.db?.collection<User>('user');
    if (users) {
      if (await users.findOne({ username: (req.body as User).username })) {
        res.status(400).send({ error: 'User already exist' });
      } else {
        const rv = await users?.insertOne(req.body as User);
        res.send(rv);
      }
    }
  }
}

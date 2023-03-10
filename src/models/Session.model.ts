import { ObjectId } from '@fastify/mongodb';

export interface Session {
  user: ObjectId;
  token: string;
  client: string;
}

import * as crypto from 'crypto';
import { Base64 } from './base64';

type Header = {
  typ: 'JWT';
  alg: 'HS256';
};

type Payload = {
  iss: 'auth.k3env.site';
  sub: string;
  iat: number;
};

function signJWT(payload: string, key: string): string {
  return crypto.createHmac('sha256', key).update(payload).digest('base64url');
}

export function generateToken(subject: string): string {
  const { APP_KEY } = process.env;
  if (APP_KEY) {
    const head = JSON.stringify({ typ: 'JWT', alg: 'HS256' });
    const payload = JSON.stringify({
      iss: 'auth.k3env.site',
      sub: subject,
      iat: Date.now(),
    });
    const head64 = Base64.encode(head);
    const pay64 = Base64.encode(payload);
    const sign = signJWT(head64 + '.' + pay64, APP_KEY);
    return `${head64}.${pay64}.${sign}`;
  } else {
    throw new Error('APP_KEY isnt set');
  }
}

export function verifyToken(token: string): boolean {
  const { APP_KEY } = process.env;
  if (APP_KEY) {
    const [hb64, pb64, sign] = token.split('.');
    const gsign = signJWT(hb64 + '.' + pb64, APP_KEY);
    return sign === gsign;
  } else {
    throw new Error('APP_KEY isnt set');
  }
}

export function decodeToken(token: string): { header: Header; payload: Payload } {
  if (verifyToken(token)) {
    const [h64, p64] = token.split('.');
    const [header, payload] = [h64, p64].map((b) => JSON.parse(Base64.decode(b)));
    return { header, payload };
  } else {
    throw new Error('JWT verification failed');
  }
}

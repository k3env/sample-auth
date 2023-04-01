import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as jose from 'jose';

export class JWT {
  public static async loadOrCreate(): Promise<{ pubKey: jose.KeyLike; privKey: jose.KeyLike }> {
    let privKey: jose.KeyLike;
    let pubKey: jose.KeyLike;
    if (!(existsSync('./pki/pub.jwk') && existsSync('./pki/key.jwk'))) {
      const keyPair = await jose.generateKeyPair('RS256');
      mkdirSync('./pki');
      writeFileSync('./pki/pub.jwk', JSON.stringify(await jose.exportJWK(keyPair.publicKey)));
      writeFileSync('./pki/key.jwk', JSON.stringify(await jose.exportJWK(keyPair.privateKey)));
      pubKey = keyPair.publicKey;
      privKey = keyPair.privateKey;
    } else {
      privKey = (await jose.importJWK(
        JSON.parse(readFileSync('./pki/key.jwk').toString('utf8')),
        'RS256',
      )) as jose.KeyLike;
      pubKey = (await jose.importJWK(
        JSON.parse(readFileSync('./pki/pub.jwk').toString('utf8')),
        'RS256',
      )) as jose.KeyLike;
    }

    return { pubKey, privKey };
  }

  public static async sign(payload: string, privateKey: jose.KeyLike): Promise<string> {
    const alg = 'RS256';
    const token = await new jose.SignJWT({ 'urn:example:claim': true })
      .setProtectedHeader({ alg })
      .setIssuedAt()
      .setIssuer('urn:example:issuer')
      .setAudience('urn:example:audience')
      .setSubject(payload)
      .setExpirationTime('2h')
      .sign(privateKey);
    return token;
  }

  public static async decode(token: string, publicKey: jose.KeyLike): Promise<jose.JWTVerifyResult> {
    return await jose.jwtVerify(token, publicKey);
  }
}

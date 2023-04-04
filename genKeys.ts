import * as jose from 'jose';
async function gen(): Promise<void> {
  const keyPair = await jose.generateKeyPair('RS256');

  console.log('pub.jwk', JSON.stringify(await jose.exportJWK(keyPair.publicKey)));
  console.log('key.jwk', JSON.stringify(await jose.exportJWK(keyPair.privateKey)));
}

gen();

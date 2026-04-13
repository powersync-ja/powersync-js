#!/usr/bin/env node
import * as jose from 'jose';
import crypto from 'node:crypto';

async function main() {
  const alg = 'RS256';
  const kid = `powersync-${crypto.randomBytes(5).toString('hex')}`;

  const { publicKey, privateKey } = await jose.generateKeyPair(alg, { extractable: true });

  const privateJwk: jose.JWK = { ...(await jose.exportJWK(privateKey)), alg, kid };
  const publicJwk: jose.JWK = { ...(await jose.exportJWK(publicKey)), alg, kid };

  const privateBase64 = Buffer.from(JSON.stringify(privateJwk)).toString('base64');
  const publicBase64 = Buffer.from(JSON.stringify(publicJwk)).toString('base64');

  console.log(`Public Key:
${JSON.stringify(publicJwk, null, 2)}

---

Add the following to your .env.local file:

POWERSYNC_PUBLIC_KEY=${publicBase64}

POWERSYNC_PRIVATE_KEY=${privateBase64}
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import * as base64 from 'https://deno.land/std@0.196.0/encoding/base64.ts';

const powerSyncPrivateKey = JSON.parse(
  new TextDecoder().decode(base64.decode(Deno.env.get('POWERSYNC_PRIVATE_KEY')!))
) as jose.JWK;

const powerSyncKey = (await jose.importJWK(powerSyncPrivateKey)) as jose.KeyLike;

const powerSyncUrl = Deno.env.get('POWERSYNC_URL')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

serve(async (req: Request) => {
  let responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
  try {
    const token = await new jose.SignJWT({})
      .setProtectedHeader({
        alg: powerSyncPrivateKey.alg!,
        kid: powerSyncPrivateKey.kid
      })
      .setSubject('anonymous')
      .setIssuedAt()
      .setIssuer(supabaseUrl)
      .setAudience(powerSyncUrl)
      .setExpirationTime('5m')
      .sign(powerSyncKey);
    return new Response(
      JSON.stringify({
        token: token,
        powersync_url: powerSyncUrl!
      }),
      {
        headers: responseHeaders,
        status: 200
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: responseHeaders,
      status: 500
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js';
import * as Y from 'npm:yjs';

Deno.serve(async (req) => {
  const { document_id } = await req.json();
  const responseHeaders = { 'Content-Type': 'application/json' };

  let hexToUint8Array = function (hexString) {
    return Uint8Array.from(
      hexString
        .replace('\\x', '')
        .match(/.{1,2}/g)
        .map((byte) => parseInt(byte, 16))
    );
  };
  let Uint8ArrayToHex = function (uint8array) {
    return '\\x' + uint8array.reduce((s, n) => s + n.toString(16).padStart(2, '0'), '');
  };

  if (!document_id) {
    return new Response(JSON.stringify({ error: 'Missing required parameter: document_id' }), {
      headers: responseHeaders,
      status: 404
    });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // use database function that retrieves all document_updates for this document as json (defined in `database.sql` in the repo)
    const supabaseRpc = await supabase.rpc('get_document_update_data', { document_id: document_id });
    if (supabaseRpc.error) {
      throw new Error(supabaseRpc.error);
    }
    let docUpdatesHex = JSON.parse(supabaseRpc.data);
    let docUpdatesCount = docUpdatesHex.length;

    // recreate the YDoc from all the document_updates rows
    const ydoc = new Y.Doc();
    docUpdatesHex.forEach((element) => {
      Y.applyUpdateV2(ydoc, hexToUint8Array(element));
    });

    // encode the current state of the full YDoc into one update
    const docState = Y.encodeStateAsUpdateV2(ydoc);

    // delete all existing updates
    // TODO: this should be wrapped in a transaction
    const supabaseDelete = await supabase.from('document_updates').delete().eq('document_id', document_id);
    if (supabaseDelete.error) {
      throw new Error(supabaseInsert.error);
    }
    // insert the new merged update as new single update for the document
    const supabaseInsert = await supabase.from('document_updates').insert({
      document_id: document_id,
      update_data: Uint8ArrayToHex(docState)
    });
    if (supabaseInsert.error) {
      throw new Error(supabaseInsert.error);
    }

    return new Response(
      JSON.stringify({
        success: docUpdatesCount + ' document_updates rows merged for document_id=' + document_id
      }),
      {
        status: 200,
        headers: responseHeaders
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }, { status: 500, headers: responseHeaders })
    );
  }
});

/*
      To test in terminal: 
        curl -L -X POST 'https://<project-ref>.supabase.co/functions/v1/merge-document-updates' -H 'Authorization: Bearer [anon-key]' --data '{"document_id":"[document-id]"}' 
*/

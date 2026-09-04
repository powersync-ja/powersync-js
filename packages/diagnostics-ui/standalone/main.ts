import { createApp, h } from 'vue';
import { DiagnosticsClient, PostMessageTransport } from '@powersync/diagnostics-core';
import { DiagnosticsPanel, provideDiagnostics } from '../src';
import '../src/style.css';

// Embed contract: this page runs in an iframe and speaks the Diagnostics Port over `postMessage` to
// its parent window. The embedder relays those wire messages to the live agent over whatever channel
// it has (VM service, chrome bridge, WebSocket) and posts agent messages back onto this frame.
const client = new DiagnosticsClient(new PostMessageTransport());
provideDiagnostics(client);

createApp({
  setup() {
    // The panel owns its own theme (self-applies `.dark`); no host-forced class.
    return () => h('div', { style: 'height: 100vh' }, [h(DiagnosticsPanel)]);
  }
}).mount('#app');

client.start();

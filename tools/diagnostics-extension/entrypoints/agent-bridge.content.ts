import { BROADCAST_CHANNEL, type WindowRelayMessage } from '../lib/envelope';

/** MAIN-world bridge: joins the page agent's BroadcastChannel and relays to the isolated world. */
export default defineContentScript({
  matches: ['http://localhost/*'],
  world: 'MAIN',
  main() {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL);

    // agent → isolated relay
    channel.onmessage = (event: MessageEvent) => {
      window.postMessage({ __psDiag: 'fromAgent', msg: event.data } satisfies WindowRelayMessage, '*');
    };

    // isolated relay → agent
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as WindowRelayMessage | undefined;
      if (data?.__psDiag === 'toAgent') channel.postMessage(data.msg);
    });
  }
});

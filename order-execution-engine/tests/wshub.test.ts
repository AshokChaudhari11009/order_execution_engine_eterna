import { wsHub } from '../src/utils/wsHub.js';
import { test } from './run-tests.js';

type FakeSocket = {
  sent: string[];
  closed: boolean;
  handlers: Record<string, Function[]>;
  send: (msg: string) => void;
  close: () => void;
  on: (event: string, cb: Function) => void;
};

function makeFakeSocket(): FakeSocket {
  return {
    sent: [],
    closed: false,
    handlers: {},
    send(msg: string) {
      this.sent.push(msg);
    },
    close() {
      this.closed = true;
      (this.handlers['close'] || []).forEach((h) => h());
    },
    on(event: string, cb: Function) {
      this.handlers[event] = this.handlers[event] || [];
      this.handlers[event].push(cb);
    },
  };
}

function makeStream(fake: FakeSocket) {
  // minimal SocketStream shape
  return { socket: fake } as any;
}

test('wsHub publish sends to subscriber', () => {
  const sock = makeFakeSocket();
  const stream = makeStream(sock);
  const orderId = 'order-1';
  wsHub.subscribe(orderId, stream);
  wsHub.publish(orderId, { hello: 'world' });
  if (sock.sent.length !== 1) throw new Error('Expected 1 message');
  const payload = JSON.parse(sock.sent[0]);
  if (payload.hello !== 'world') throw new Error('Payload mismatch');
});

test('wsHub closeAll closes sockets', async () => {
  const a = makeFakeSocket();
  const b = makeFakeSocket();
  wsHub.subscribe('o1', makeStream(a));
  wsHub.subscribe('o2', makeStream(b));
  await wsHub.closeAll();
  if (!a.closed || !b.closed) throw new Error('Expected sockets to be closed');
});

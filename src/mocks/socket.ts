import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import type { VersionedEvent, Nft, Order } from '../contracts';

/**
 * MSW mock WebSocket endpoint for the real socket.io-client.
 * The published @mswjs/socket.io-binding 0.2.x exposes toSocketIo,
 * not the SocketIo protocol constructor from the unreleased examples.
 */
// Use a dedicated path shared with socket.io-client. MSW normalizes the
// conventional /socket.io/ prefix when matching handlers, which can prevent
// a handler registered for /socket.io/ from matching the actual connection.
// This dedicated path also avoids capturing Vite's HMR WebSocket at /.
const socketUrl = new URL('/kurio-realtime/', location.origin);
socketUrl.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const channel = ws.link(socketUrl.toString());
type MockSocketClient = ReturnType<typeof toSocketIo>['client'];
const clients = new Set<MockSocketClient>();

export const socketHandler = channel.addEventListener('connection', (connection) => {
  // This adapter performs the Socket.IO handshake and framing.
  const socket = toSocketIo(connection);
  clients.add(socket.client);
  if (import.meta.env.DEV) console.info('[Kurio MSW Socket] conexão interceptada. Clientes:', clients.size);
  connection.client.addEventListener('close', () => clients.delete(socket.client));
});

export function publishNft(nft: Nft) {
  const payload: VersionedEvent<Nft> = {
    eventId: crypto.randomUUID(),
    resourceId: nft.id,
    version: nft.version,
    data: nft,
  };
  if (import.meta.env.DEV) console.info('[Kurio MSW Socket] enviando nft.updated',nft.id,'clientes:',clients.size);
  for (const client of clients) client.emit('nft.updated', payload);
}

/** Deterministic realtime scenarios exposed only by demo REST routes.
 * Events pass through the actual MSW Socket.IO transport. The fixture never
 * writes to the database or invokes a React state setter.
 */
export function connectedRealtimeClients() {
  return clients.size;
}

export function publishNftScenario(nft: Nft, scenario: 'duplicate' | 'out-of-order') {
  const current: VersionedEvent<Nft> = {
    eventId: crypto.randomUUID(),
    resourceId: nft.id,
    version: nft.version,
    data: structuredClone(nft),
  };
  const staleVersion = Math.max(0, nft.version - 1);
  const stale: VersionedEvent<Nft> = {
    eventId: crypto.randomUUID(),
    resourceId: nft.id,
    version: staleVersion,
    data: {
      ...structuredClone(nft),
      priceEth: '0.01',
      version: staleVersion,
      editions: nft.editions.map(offer => ({ ...offer, priceEth: '0.01' })),
    },
  };
  const messages = scenario === 'duplicate' ? [current, current] : [current, stale];
  for (const client of clients) {
    for (const message of messages) client.emit('nft.updated', message);
  }
  return { scenario, clients: clients.size, versions: messages.map(message => message.version) };
}

export function publishOrder(order: Order) {
  const payload: VersionedEvent<Order> = {
    eventId: crypto.randomUUID(),
    resourceId: order.id,
    userId: order.userId,
    version: order.status === 'pending' ? 1 : 2,
    data: order,
  };
  for (const client of clients) client.emit('order.updated', payload);
}

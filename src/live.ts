import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import type { Nft, Order, VersionedEvent } from './contracts';
import { api } from './api';

/**
 * IMPORTANT: socket.io-client must NOT be imported at runtime before
 * MSW's worker.start() finishes. Socket.IO captures global WebSocket at
 * module evaluation time; an early import bypasses MSW's WS interception.
 *
 * This function is called by LiveState's useEffect, i.e. after the React
 * tree is rendered and after main.tsx boot() awaits worker.start().
 */
export function subscribeLive(qc: QueryClient, userId: string | null) {
  const versions = new Map<string, number>();
  let disposed = false;
  let socket: Socket | undefined;

  // Runtime import intentionally delayed until AFTER MSW is ready.
  void import('socket.io-client').then(({ io }) => {
    // React StrictMode, logout, or user switching may dispose the effect
    // before the import resolves. Never create a stale subscription.
    if (disposed) return;

    socket = io(window.location.origin, {
      path: '/kurio-realtime',
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 250,
      reconnectionDelayMax: 1000,
      randomizationFactor: 0,
      timeout: 5000,
    });

    socket.on('nft.updated', (evt: VersionedEvent<Nft>) => {
      if (import.meta.env.DEV) console.info('[Kurio Socket.IO] nft.updated recebido', evt.resourceId, evt.version);
      const key = `nft:${evt.resourceId}`;
      if ((versions.get(key) ?? 0) >= evt.version) return;
      versions.set(key, evt.version);
      qc.setQueryData<Nft>(['nft', evt.resourceId], old => old && old.version > evt.version ? old : evt.data);
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['quote'] });
    });

    socket.on('order.updated', (evt: VersionedEvent<Order>) => {
      if (evt.userId !== userId) return;
      const key = `order:${evt.resourceId}`;
      if ((versions.get(key) ?? 0) >= evt.version) return;
      versions.set(key, evt.version);
      qc.setQueryData(['order', evt.resourceId], evt.data);
      void qc.invalidateQueries({ queryKey: ['cart'] });
    });

    socket.on('connect', () => {
      if (import.meta.env.DEV) console.info('[Kurio Socket.IO] Conectado', socket?.id);
      void qc.invalidateQueries({ queryKey: ['nft'] });
      void qc.invalidateQueries({ queryKey: ['catalog'] });
      void qc.invalidateQueries({ queryKey: ['cart'] });
      void qc.invalidateQueries({ queryKey: ['quote'] });
      void qc.invalidateQueries({ queryKey: ['order'] });
    });

    socket.on('disconnect', reason => {
      if (import.meta.env.DEV) console.warn('[Kurio Socket.IO] Desconectado:', reason);
    });

    socket.on('connect_error', error => {
      if (import.meta.env.DEV) console.warn('[Kurio Socket.IO] Falha na conexão:', error.message);
    });

    socket.connect();
  }).catch(error => {
    if (!disposed) console.error('[Kurio Socket.IO] Não foi possível carregar o cliente:', error);
  });

  return () => {
    disposed = true;
    socket?.removeAllListeners();
    socket?.disconnect();
  };
}

export async function clearIdentity(qc: QueryClient) {
  try {
    await api.logout();
  } finally {
    localStorage.removeItem('nft-token');
    qc.clear();
  }
}

import { SignalingClient } from '@chat/sockets';

let clientInstance: SignalingClient | null = null;

export function initSignalingClient(client: SignalingClient) {
  clientInstance = client;
}

export function getSignalingClient(): SignalingClient {
  if (!clientInstance) throw new Error('SignalingClient singleton is not initialized');
  return clientInstance;
}

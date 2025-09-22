import { SignalingClient } from '@chat/sockets';
import { getDB } from './storage';

let singletonClient: SignalingClient | null = null;

export function initSignalingClient(client: SignalingClient) {
  if (!singletonClient) singletonClient = client;
  return singletonClient;
}

export async function getSignalingClient(): Promise<SignalingClient> {
  if (!singletonClient) {
    const db = await getDB();
    const creds = await db.getAll("user");
    if (!creds) throw new Error("No credentials available");
    singletonClient = new SignalingClient(
      creds[0].userId,
      creds[0].username,
      creds[0].public.toString()
    );
    await singletonClient.connect("ws://localhost:8080");
  }
  return singletonClient;
}

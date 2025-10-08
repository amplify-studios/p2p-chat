import { SignalingClient } from '@chat/sockets';
import { getDB, PASSWORD_KEY } from './storage';
import { decryptCredentialsType, EncryptedCredentialsType, generateAESKey } from '@chat/crypto';
// import { CLIENT_CONFIG } from '@chat/core';

let singletonClient: SignalingClient | null = null;

// const SERVER_URL = CLIENT_CONFIG.signalingUrl;
const SERVER_URL = "https://p2p-signaling-55197d11d9bf.herokuapp.com/";

/**
 * Initialize the singleton manually (optional).
 */
export function initSignalingClient(client: SignalingClient) {
  if (!singletonClient) singletonClient = client;
  return singletonClient;
}

/**
 * Returns the singleton signaling client.
 * If not initialized, creates one from stored credentials.
 * Handles reconnects and prevents duplicate joins.
 */
export async function getSignalingClient(): Promise<SignalingClient> {
  if (singletonClient) {
    // If the existing WS is closed, attempt reconnect
    if (!singletonClient.ws || singletonClient.ws.readyState !== WebSocket.OPEN) {
      await singletonClient.reconnect(SERVER_URL);
    }
    return singletonClient;
  }

  // Fetch encrypted credentials from DB
  const db = await getDB();
  const encrCreds = (await db.getAll('user')) as EncryptedCredentialsType[];
  if (!encrCreds || encrCreds.length === 0) {
    throw new Error('No credentials available in DB');
  }

  const storedPass = sessionStorage.getItem(PASSWORD_KEY);
  if (!storedPass) {
    throw new Error('Password not found in sessionStorage. User must unlock first.');
  }

  const aesKey = generateAESKey(new TextEncoder().encode(storedPass));
  if (!aesKey) throw new Error('Failed to generate AES key from stored password');

  const creds = decryptCredentialsType(encrCreds[0], aesKey);
  if (!creds) throw new Error('Failed to decrypt user credentials');

  singletonClient = new SignalingClient(creds.userId, creds.username, creds.public);

  // Connect and auto-reconnect built into SignalingClient
  await singletonClient.connect(SERVER_URL);

  return singletonClient;
}

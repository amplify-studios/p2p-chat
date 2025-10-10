import { SignalingClient } from '@chat/sockets';
import { getDB, PASSWORD_KEY } from './storage';
import {
  decryptCredentialsType,
  decryptServerSettingsType,
  EncryptedCredentialsType,
  generateAESKey,
} from '@chat/crypto';
import { CLIENT_CONFIG } from '@chat/core';

let singletonClient: SignalingClient | null = null;

export function initSignalingClient(client: SignalingClient) {
  if (!singletonClient) singletonClient = client;
  return singletonClient;
}

export async function getSignalingClient(): Promise<SignalingClient | null> {
  const db = await getDB();

  const encrCreds = (await db.getAll('user')) as EncryptedCredentialsType[];
  if (!encrCreds?.length) throw new Error('No credentials found');

  const storedPass = sessionStorage.getItem(PASSWORD_KEY);
  if (!storedPass) {
    console.warn('Password not found in sessionStorage');
    return null;
  }

  const aesKey = generateAESKey(new TextEncoder().encode(storedPass));
  const creds = decryptCredentialsType(encrCreds[0], aesKey);
  if (!creds) throw new Error('Failed to decrypt user credentials');

  const encryptedServerSettings = (await db.getAll('serverSettings'))[0];
  const serverSettings = encryptedServerSettings
    ? decryptServerSettingsType(encryptedServerSettings, aesKey)
    : null;

  const SERVER_URL =
    serverSettings?.selectedServers?.[0] || CLIENT_CONFIG.signalingUrls[0];

  // Reuse or re-init client
  if (singletonClient) {
    const sameUrl = singletonClient.url === SERVER_URL;
    const connected = singletonClient.ws?.readyState === WebSocket.OPEN;

    if (connected && sameUrl) return singletonClient;

    try {
      if (!sameUrl) singletonClient.disconnect();
      singletonClient = new SignalingClient(
        SERVER_URL,
        creds.userId,
        creds.username,
        creds.public
      );
      await singletonClient.connect();
      return singletonClient;
    } catch (err) {
      console.error('Reconnect failed:', err);
      return null;
    }
  }

  // Fresh client
  singletonClient = new SignalingClient(
    SERVER_URL,
    creds.userId,
    creds.username,
    creds.public
  );
  await singletonClient.connect();

  return singletonClient;
}

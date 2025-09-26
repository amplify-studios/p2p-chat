import { SignalingClient } from '@chat/sockets';
import { getDB, PASSWORD_KEY } from './storage';
import { decryptCredentialsType, EncryptedCredentialsType, generateAESKey } from '@chat/crypto';

let singletonClient: SignalingClient | null = null;

export function initSignalingClient(client: SignalingClient) {
  if (!singletonClient) singletonClient = client;
  return singletonClient;
}

/**
 * Returns the singleton signaling client.
 * If the client is not initialized yet, it tries to create one
 * using the stored user credentials and password in sessionStorage.
 * Throws an error if credentials are missing or cannot be decrypted.
 */
export async function getSignalingClient(): Promise<SignalingClient> {
  if (singletonClient) return singletonClient;

  const db = await getDB();
  const encrCreds = (await db.getAll("user")) as EncryptedCredentialsType[];
  if (!encrCreds || encrCreds.length === 0) {
    throw new Error("No credentials available in DB");
  }

  const storedPass = sessionStorage.getItem(PASSWORD_KEY);
  if (!storedPass) {
    throw new Error("Password not found in sessionStorage. User must unlock first.");
  }

  const aesKey = generateAESKey(new TextEncoder().encode(storedPass));
  if (!aesKey) throw new Error("Failed to generate AES key from stored password");

  const creds = decryptCredentialsType(encrCreds[0], aesKey);
  if (!creds) throw new Error("Failed to decrypt user credentials");

  singletonClient = new SignalingClient(creds.userId, creds.username, creds.public);
  await singletonClient.connect("ws://192.168.1.6:8080"); // TODO: change to config

  return singletonClient;
}

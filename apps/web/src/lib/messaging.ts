import { createECDHkey, computeSecret, generateAESKey, AESencrypt } from '@chat/crypto';

export function prepareSendMessagePackage(otherUserPublicKey: string, message: string): {
  encryptedMessage: string,
  authTag: string,
  ephemeralPublicKey: string
} {
  const ephemeralKeyPair = createECDHkey();
  const secret = computeSecret(ephemeralKeyPair, otherUserPublicKey);

  //TODO:  3. Run the shared secret through HKDF → get an AES-256-GCM session key.

  generateAESKey(secret);
  const data = AESencrypt(secret, message);
  return {encryptedMessage: data.encryptedMessage, authTag: data.authTag, ephemeralPublicKey: ephemeralKeyPair.getPublicKey().toString('hex')};
}

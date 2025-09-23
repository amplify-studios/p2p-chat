import { createECDHkey, computeSecret, AESencrypt, AESdecrypt, generateAESKey } from '@chat/crypto';
import { MessagePackage } from '@chat/core';
import crypto from 'crypto';

export function prepareSendMessagePackage(otherUserPublicKey: string, message: string): MessagePackage {
  const ephemeralKeyPair = createECDHkey();
  const secret = computeSecret(ephemeralKeyPair, otherUserPublicKey);
  // const key = getAESKeyThroughSharedSecret(secret);
  // const data = AESencrypt(key.key, message);
  const key = generateAESKey(secret);
  const data = AESencrypt(key, message);
  return {encryptedMessage: data.encryptedMessage, authTag: data.authTag, ephemeralPublicKey: ephemeralKeyPair.getPublicKey().toString('hex'), iv: data.iv};
}

export function returnDecryptedMessage(user: crypto.ECDH, messagePackage: MessagePackage): string {
  const secret = computeSecret(user, messagePackage.ephemeralPublicKey);
  const key = generateAESKey(secret);
  return AESdecrypt(key, messagePackage.encryptedMessage, messagePackage.authTag, messagePackage.iv);
}

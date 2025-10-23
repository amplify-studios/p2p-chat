import { createECDHkey, computeSecret, AESencrypt, AESdecrypt, generateAESKey } from '@chat/crypto';
import { MessagePackage } from '@chat/core';
import crypto from 'crypto';

export function prepareSendMessagePackage(
  otherUserPublicKey: string,
  message: string,
): MessagePackage {
  const ephemeralKeyPair = createECDHkey();
  const secret = computeSecret(ephemeralKeyPair, otherUserPublicKey);
  // const key = getAESKeyThroughSharedSecret(secret);
  // const data = AESencrypt(key.key, message);
  console.log('[prepareSendMessagePackage] message', message);
  const key = generateAESKey(secret);
  const data = AESencrypt(key, message);
  return {
    encryptedMessage: data.encryptedMessage,
    authTag: data.authTag,
    ephemeralPublicKey: ephemeralKeyPair.getPublicKey().toString('hex'),
    iv: data.iv,
  };
}

export function returnDecryptedMessage(user: crypto.ECDH, messagePackage: MessagePackage): string {
  // const secret = computeSecret(user, Uint8Array.from(messagePackage.ephemeralPublicKey));
  const secret = computeSecret(
    user,
    new Uint8Array(Buffer.from(messagePackage.ephemeralPublicKey, 'hex')),
  );

  console.log('[returnDecryptedMessage] secret', secret);
  console.log('[returnDecryptedMessage] messagePackage', messagePackage);
  const key = generateAESKey(secret);
  console.log('[returnDecryptedMessage] key', key);
  return AESdecrypt(
    key,
    messagePackage.encryptedMessage,
    messagePackage.authTag,
    messagePackage.iv,
  );
}

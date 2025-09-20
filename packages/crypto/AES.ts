import crypto from "crypto";

export function generateAESKey(computed_secret: Buffer): Buffer {
  return crypto.createHash('sha256').update(computed_secret).digest()
}

export function AESencrypt(key: Buffer, message: string): {encryptedMessage: string, authTag: string} {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encryptedMessage = cipher.update(message, "utf8", "hex");
  encryptedMessage += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {encryptedMessage: encryptedMessage, authTag: authTag};
}

export function AESdecrypt(key: Buffer, encryptedMessage: string, authTag: string): string {
  const iv = crypto.randomBytes(12);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decryptedMessage = decipher.update(encryptedMessage, "hex", "utf8");
  decryptedMessage += decipher.final("utf8");

  return decryptedMessage;
}

export interface MessagePackage {
  encryptedMessage: string;
  authTag: string;
  ephemeralPublicKey: string;
  iv: string;
}

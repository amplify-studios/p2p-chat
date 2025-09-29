export interface EncryptedMessageType extends Omit<MessageType, 'roomId' | 'senderId' | 'message'> {
  roomId: EncryptedField;
  senderId: EncryptedField;
  message: EncryptedField;
}

export function encryptMessageType(msg: MessageType, key: Uint8Array): EncryptedMessageType {
  return {
    ...msg,
    roomId: encField(key, msg.roomId),
    senderId: encField(key, msg.senderId),
    message: encField(key, msg.message),
  };
}

export function decryptMessageType(enc: EncryptedMessageType, key: Uint8Array): MessageType {
  return {
    ...enc,
    roomId: decField(key, enc.roomId),
    senderId: decField(key, enc.senderId),
    message: decField(key, enc.message),
  };
}

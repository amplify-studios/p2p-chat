import {
  BlockType,
  CredentialsType,
  InviteType,
  MessageType,
  RoomType,
  ServerSettingsType,
} from '@chat/core';
import { AESencrypt, AESdecrypt } from './AES';
import BlocklistPage from '@/app/blocked/page';

export interface EncryptedField {
  encryptedMessage: string;
  authTag: string;
  iv: string;
}

function encField(key: Uint8Array, value: string): EncryptedField {
  return AESencrypt(key, value);
}

function decField(key: Uint8Array, payload: EncryptedField): string {
  return AESdecrypt(key, payload.encryptedMessage, payload.authTag, payload.iv);
}

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

export interface EncryptedCredentialsType extends Omit<CredentialsType, 'private' | 'username'> {
  username: EncryptedField;
  private?: EncryptedField;
}

export function encryptCredentialsType(
  creds: CredentialsType,
  key: Uint8Array,
): EncryptedCredentialsType {
  return {
    ...creds,
    username: encField(key, creds.username),
    private: creds.private ? encField(key, creds.private) : undefined,
  };
}

export function decryptCredentialsType(
  enc: EncryptedCredentialsType,
  key: Uint8Array,
): CredentialsType {
  return {
    ...enc,
    username: decField(key, enc.username),
    private: enc.private ? decField(key, enc.private) : undefined,
  };
}

export interface EncryptedRoomType extends Omit<RoomType, 'name' | 'keys'> {
  name: EncryptedField;
  keys: EncryptedCredentialsType[];
}

export function encryptRoomType(room: RoomType, key: Uint8Array): EncryptedRoomType {
  return {
    ...room,
    name: encField(key, room.name),
    keys: room.keys.map((k) => encryptCredentialsType(k, key)),
  };
}

export function decryptRoomType(enc: EncryptedRoomType, key: Uint8Array): RoomType {
  return {
    ...enc,
    name: decField(key, enc.name),
    keys: enc.keys.map((k) => decryptCredentialsType(k, key)),
  };
}

export interface EncryptedInviteType extends Omit<InviteType, 'from' | 'name'> {
  from: EncryptedField;
  name: EncryptedField;
}

export function encryptInviteType(invite: InviteType, key: Uint8Array): EncryptedInviteType {
  return {
    ...invite,
    from: encField(key, invite.from),
    name: encField(key, invite.name),
  };
}

export function decryptInviteType(enc: EncryptedInviteType, key: Uint8Array): InviteType {
  return {
    ...enc,
    from: decField(key, enc.from),
    name: decField(key, enc.name),
  } as InviteType;
}

export interface EncryptedBlockType extends Omit<BlockType, 'username'> {
  username: EncryptedField;
}

export function encryptBlockType(block: BlockType, key: Uint8Array): EncryptedBlockType {
  return {
    ...block,
    username: encField(key, block.username),
  };
}

export function decryptBlockType(enc: EncryptedBlockType, key: Uint8Array): BlockType {
  return {
    ...enc,
    username: decField(key, enc.username),
  };
}

export interface EncryptedServerSettingsType
  extends Omit<ServerSettingsType, 'selectedServers' | 'userServers'> {
  selectedServers: EncryptedField[];
  userServers: EncryptedField[];
}

export function encryptServerSettingsType(
  settings: ServerSettingsType,
  key: Uint8Array,
): EncryptedServerSettingsType {
  return {
    ...settings,
    selectedServers: settings.selectedServers.map((s) => encField(key, s)),
    userServers: settings.userServers.map((s) => encField(key, s)),
  };
}

export function decryptServerSettingsType(
  enc: EncryptedServerSettingsType,
  key: Uint8Array,
): ServerSettingsType {
  return {
    ...enc,
    selectedServers: enc.selectedServers.map((s) => decField(key, s)),
    userServers: enc.userServers.map((s) => decField(key, s)),
  };
}

export type EncryptedStorageType =
  | EncryptedMessageType
  | EncryptedCredentialsType
  | EncryptedRoomType
  | EncryptedInviteType
  | EncryptedBlockType
  | EncryptedServerSettingsType;

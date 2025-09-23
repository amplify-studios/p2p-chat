'use client';

import { useEffect, useState } from 'react';
import type { Collection, MyDB } from '@/lib/storage';
import { getDB } from '@/lib/storage';
import { IDBPDatabase } from 'idb';
import { 
  decryptMessageType, EncryptedMessageType,
  decryptCredentialsType, EncryptedCredentialsType,
  decryptRoomType, EncryptedRoomType,
  decryptInviteType, EncryptedInviteType,
  decryptBlockType, EncryptedBlockType,
  encryptMessageType,
  encryptCredentialsType,
  encryptRoomType,
  encryptInviteType,
  encryptBlockType,
  EncryptedStorageType,
} from '@chat/crypto';
import { BlockType, CredentialsType, InviteType, MessageType, RoomType, StorageType } from '@chat/core';

export function useDB() {
  const [db, setDb] = useState<IDBPDatabase<MyDB> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const database = await getDB();
      if (!cancelled) setDb(database);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function putEncr(collection: Collection, obj: StorageType, key: Uint8Array): Promise<EncryptedStorageType | null>{
    if (!db) return null;

    let encr: EncryptedStorageType;

    switch (collection) {
      case 'messages':
        encr = encryptMessageType(obj as MessageType, key);
      break;

      case 'credentials':
        encr = encryptCredentialsType(obj as CredentialsType, key);
        break;

      case 'user':
        encr = encryptCredentialsType(obj as CredentialsType, key);
        break;

      case 'rooms':
        encr = encryptRoomType(obj as RoomType, key);
        break;

      case 'invites':
        encr = encryptInviteType(obj as InviteType, key);
        break;

      case 'blocks':
        encr = encryptBlockType(obj as BlockType, key);
        break;

      default:
        throw new Error(`Unknown collection: ${collection}`);
    }

    if (encr) {
      await db.put(collection, encr as EncryptedStorageType);
      return encr;
    }
    return null;
  }

  async function getAllDecr(collection: Collection, key: Uint8Array) {
    if (!db) return [];

    const encrypted = await db.getAll(collection);

    const decrypted = encrypted.map((e) => {
      try {
        switch (collection) {
          case 'messages':
            return decryptMessageType(e as EncryptedMessageType, key);
          case 'credentials':
          case 'user':
            return decryptCredentialsType(e as EncryptedCredentialsType, key);
          case 'rooms':
            return decryptRoomType(e as EncryptedRoomType, key);
          case 'invites':
            return decryptInviteType(e as EncryptedInviteType, key);
          case 'blocks':
            return decryptBlockType(e as EncryptedBlockType, key);
          default:
            throw new Error(`Unknown collection: ${collection}`);
        }
      } catch (err) {
        console.error(`Failed to decrypt item in ${collection}:`, err);
        return null;
      }
    });

    return decrypted;
  }

  return { db, getAllDecr, putEncr };
}

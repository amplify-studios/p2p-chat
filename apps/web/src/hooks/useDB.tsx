'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Collection, MyDB } from '@/lib/storage';
import { getDB } from '@/lib/storage';
import { IDBPDatabase } from 'idb';
import {
  decryptMessageType,
  EncryptedMessageType,
  decryptCredentialsType,
  EncryptedCredentialsType,
  decryptRoomType,
  EncryptedRoomType,
  decryptInviteType,
  EncryptedInviteType,
  decryptBlockType,
  EncryptedBlockType,
  encryptMessageType,
  encryptCredentialsType,
  encryptRoomType,
  encryptInviteType,
  encryptBlockType,
  EncryptedStorageType,
  decryptServerSettingsType,
  EncryptedServerSettingsType,
  encryptServerSettingsType,
} from '@chat/crypto';
import {
  BlockType,
  CredentialsType,
  InviteType,
  MessageType,
  RoomType,
  ServerSettingsType,
  Type,
} from '@chat/core';

type DBContextType = {
  db: IDBPDatabase<MyDB> | null;
  putEncr: (
    collection: Collection,
    obj: Type,
    key: Uint8Array,
    collectionKey?: string | number,
  ) => Promise<EncryptedStorageType | null>;
  getAllDecr: (collection: Collection, key: Uint8Array) => Promise<any[]>;
};

const DBContext = createContext<DBContextType | undefined>(undefined);

export function DBProvider({ children }: { children: ReactNode }) {
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

  const putEncr = useCallback(
    async (
      collection: Collection,
      obj: Type,
      key: Uint8Array,
      collectionKey?: string | number,
    ): Promise<EncryptedStorageType | null> => {
      if (!db) return null;

      let encr: EncryptedStorageType;
      switch (collection) {
        case 'messages':
          encr = encryptMessageType(obj as MessageType, key);
          break;
        case 'credentials':
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
        case 'serverSettings':
          encr = encryptServerSettingsType(obj as ServerSettingsType, key);
          break;
        default:
          throw new Error(`Unknown collection: ${collection}`);
      }

      if (encr) {
        await db.put(collection, encr as EncryptedStorageType, collectionKey);
        return encr;
      }
      return null;
    },
    [db],
  );

  const getAllDecr = useCallback(
    async (collection: Collection, key: Uint8Array) => {
      if (!db) return [];

      const encrypted = await db.getAll(collection);

      return encrypted.map((e) => {
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
              case 'serverSettings':
                return decryptServerSettingsType(e as EncryptedServerSettingsType, key);
              default:
                throw new Error(`Unknown collection: ${collection}`);
            }
          } catch (err) {
            console.error(`Failed to decrypt item in ${collection}:`, err);
            return null;
          }
        })
        .filter(Boolean);
    },
    [db],
  );

  return (
    <DBContext.Provider value={{ db, putEncr, getAllDecr }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDB() {
  const context = useContext(DBContext);
  if (!context) {
    throw new Error('useDB must be used within a DBProvider');
  }
  return context;
}

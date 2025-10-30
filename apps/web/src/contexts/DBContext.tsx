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
  generateUUID,
  generateBase58Id,
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
  updateEncr: (
    collection: Collection,
    key: Uint8Array,
    id: string | number,
    updater: (oldData: any) => any,
  ) => Promise<boolean>;
};

const DBContext = createContext<DBContextType | undefined>(undefined);

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<IDBPDatabase<MyDB> | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const database = await getDB();
      database.onerror = (event) => {
        console.error('DB error: ', event);
      };

      if (!cancelled) setDb(database);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Encrypt and store an object ----
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
          const msg = obj as MessageType;
          if (!msg.id || msg.id == '') msg.id = generateBase58Id();
          encr = encryptMessageType(msg, key);
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
        if (String(collection) == 'messages') {
          await db.put(collection, encr);
        } else {
          await db.put(collection, encr, collectionKey);
        }
        return encr;
      }

      return null;
    },
    [db],
  );

  // ---- Get and decrypt all ----
  const getAllDecr = useCallback(
    async (collection: Collection, key: Uint8Array) => {
      if (!db) return [];

      const encrypted = await db.getAll(collection);
      return encrypted
        .map((e) => {
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

  // ---- Update and re-encrypt ----
  const updateEncr = useCallback(
    async (
      collection: Collection,
      key: Uint8Array,
      id: string | number,
      updater: (oldData: any) => any,
    ): Promise<boolean> => {
      // console.log('updateEncr', collection, key, id, updater, db);
      if (!db) return false;

      try {
      
        let existing: any;
        console.log('existing', existing);
        switch (collection) {
          case 'messages':
            console.log('existing messages', existing);
            existing = await db.getFromIndex('messages', 'key', String(id));
            console.log('existing messages 2', existing);
            break;
          default:
            existing = await db.get(collection, id);
        }

        console.log('existing', existing);
        if (!existing) return false;

        let decrypted: any;
        switch (collection) {
          case 'messages':
            decrypted = decryptMessageType(existing as EncryptedMessageType, key);
            break;
          case 'credentials':
          case 'user':
            decrypted = decryptCredentialsType(existing as EncryptedCredentialsType, key);
            break;
          case 'rooms':
            decrypted = decryptRoomType(existing as EncryptedRoomType, key);
            break;
          case 'invites':
            decrypted = decryptInviteType(existing as EncryptedInviteType, key);
            break;
          case 'blocks':
            decrypted = decryptBlockType(existing as EncryptedBlockType, key);
            break;
          case 'serverSettings':
            decrypted = decryptServerSettingsType(existing as EncryptedServerSettingsType, key);
            break;
          default:
            throw new Error(`Unknown collection: ${collection}`);
        }
        const updated = updater(decrypted);

        console.log('updated', updated);
        await putEncr(collection, updated, key, id);

        return true;
      } catch (err) {
        console.error(`Failed to update record in ${collection}:`, err);
        return false;
      }
    },
    [db, putEncr],
  );

  return (
    <DBContext.Provider value={{ db, putEncr, getAllDecr, updateEncr }}>
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

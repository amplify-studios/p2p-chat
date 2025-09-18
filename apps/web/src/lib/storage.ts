import { MessageType, CredentialsType } from '@chat/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MyDB extends DBSchema {
  messages: {
    key: string;
    value: MessageType;
  },
  credentials: {
    key: string;
    value: CredentialsType;
  }
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>('my-database', 1, {
      upgrade(db) {
        db.createObjectStore('messages', { keyPath: 'text' });
        db.createObjectStore('credentials', { keyPath: 'text' });
      },
    });
  }
  return dbPromise;
}

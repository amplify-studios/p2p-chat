import { MessageType, CredentialsType } from '@chat/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MyDB extends DBSchema {
  messages: {
    key: number;
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
    dbPromise = openDB<MyDB>('my-database', 2, {
      upgrade(db) {
        db.createObjectStore('messages', { autoIncrement: true });
        db.createObjectStore('credentials', { keyPath: "userId" });
      },
    });
  }
  return dbPromise;
}

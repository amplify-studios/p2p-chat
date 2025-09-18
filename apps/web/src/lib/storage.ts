import { MessageType, CredentialsType, RoomType } from '@chat/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MyDB extends DBSchema {
  messages: {
    key: number;
    value: MessageType;
  };
  credentials: {
    key: string;
    value: CredentialsType;
  };
  rooms: {
    key: string;
    value: RoomType;
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>('my-database', 3, {
      upgrade(db) {
        db.createObjectStore('messages', { autoIncrement: true });
        db.createObjectStore('credentials', { keyPath: 'userId' });
        db.createObjectStore('rooms', { keyPath: 'roomId' });
      },
    });
  }
  return dbPromise;
}

// TODO: backup / restore data

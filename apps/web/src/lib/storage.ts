import { MessageType, CredentialsType } from '@chat/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MyDB extends DBSchema {
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
      },
    });
  }
  return dbPromise;
}

export async function addMessage(message: MessageType) {
  const db = await getDB();
  await db.put('messages', message);
}

export async function getMessages() {
  const db = await getDB();
  return db.getAll('messages');
}


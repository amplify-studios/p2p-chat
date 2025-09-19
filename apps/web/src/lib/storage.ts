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


type Backup = {
  messages: MessageType[];
  credentials: CredentialsType[];
  rooms: RoomType[];
};

export async function backupDB() {
  const db = await getDB();
  const backup: Backup = {
    messages: [],
    credentials: [],
    rooms: [],
  };

  backup.messages = await db.getAll('messages');
  backup.credentials = await db.getAll('credentials');
  backup.rooms = await db.getAll('rooms');

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'p2p-chat-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

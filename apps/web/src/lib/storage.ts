import { MessageType, CredentialsType, RoomType, InviteType } from '@chat/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface MyDB extends DBSchema {
  messages: {
    key: number;
    value: MessageType;
  };
  user: {
    key: number;
    value: CredentialsType;
  }
  credentials: {
    key: string;
    value: CredentialsType;
  };
  rooms: {
    key: string;
    value: RoomType;
  };
  invites: {
    key: string;
    value: InviteType;
  }
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>('my-database', 6, {
      upgrade(db) {
        db.createObjectStore('messages', { autoIncrement: true });
        db.createObjectStore('user', { autoIncrement: true });
        db.createObjectStore('credentials', { keyPath: 'userId' });
        db.createObjectStore('rooms', { keyPath: 'roomId' });
        db.createObjectStore('invites', { keyPath: 'inviteId' });
      },
    });
  }
  return dbPromise;
}


type Backup = {
  messages: MessageType[];
  credentials: CredentialsType[];
  rooms: RoomType[];
  invites: InviteType[];
};

export async function backupDB() {
  const db = await getDB();
  const backup: Backup = {
    messages: [],
    credentials: [],
    rooms: [],
    invites: [],
  };

  backup.messages = await db.getAll('messages');
  backup.credentials = await db.getAll('credentials');
  backup.rooms = await db.getAll('rooms');
  backup.invites = await db.getAll('invites');

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'p2p-chat-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function eraseDB() {
  const db = await getDB();

  const tx = db.transaction(['messages', 'credentials', 'rooms', 'invites'], 'readwrite');
  await Promise.all([
    tx.objectStore('messages').clear(),
    tx.objectStore('credentials').clear(),
    tx.objectStore('rooms').clear(),
    tx.objectStore('invites').clear(),
  ]);

  await tx.done;
}

import { MessageType, CredentialsType, RoomType, InviteType } from '@chat/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = "my-database";
const DB_VERSION = 6;
const BACKUP_FILE = "p2p-chat-backup.json";

interface MyDB extends DBSchema {
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

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
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
  user: CredentialsType[];
  rooms: RoomType[];
  invites: InviteType[];
};

async function backupDB() {
  const db = await getDB();
  const backup: Backup = {
    messages: [],
    credentials: [],
    user: [],
    rooms: [],
    invites: [],
  };

  backup.messages = await db.getAll('messages');
  backup.credentials = await db.getAll('credentials');
  backup.user = await db.getAll('user');
  backup.rooms = await db.getAll('rooms');
  backup.invites = await db.getAll('invites');

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = BACKUP_FILE;
  a.click();
  URL.revokeObjectURL(url);
}

async function eraseDB() {
  const db = await getDB();

  const tx = db.transaction(['user', 'messages', 'credentials', 'rooms', 'invites'], 'readwrite');
  await Promise.all([
    tx.objectStore('messages').clear(),
    tx.objectStore('credentials').clear(),
    tx.objectStore('user').clear(),
    tx.objectStore('rooms').clear(),
    tx.objectStore('invites').clear(),
  ]);

  await tx.done;
}

async function restoreDB(jsonString: string) {
  let backup: Backup;
  try {
    backup = JSON.parse(jsonString);
  } catch (err) {
    console.error('Invalid JSON string provided for restore:', err);
    return;
  }

  if (
    !backup.messages ||
    !backup.credentials ||
    !backup.user ||
    !backup.rooms ||
    !backup.invites
  ) {
    console.error('Backup JSON is missing required fields');
    return;
  }

  const db = await getDB();

  const tx = db.transaction(
    ['messages', 'credentials', 'user', 'rooms', 'invites'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('messages').clear(),
    tx.objectStore('credentials').clear(),
    tx.objectStore('user').clear(),
    tx.objectStore('rooms').clear(),
    tx.objectStore('invites').clear(),
  ]);

  for (const msg of backup.messages) {
    await tx.objectStore('messages').add(msg);
  }

  for (const cred of backup.credentials) {
    await tx.objectStore('credentials').put(cred);
  }

  for (const u of backup.user) {
    await tx.objectStore('user').add(u);
  }

  for (const room of backup.rooms) {
    await tx.objectStore('rooms').put(room);
  }

  for (const invite of backup.invites) {
    await tx.objectStore('invites').put(invite);
  }

  await tx.done;
  console.log('Database restored successfully!');
}

export type { MyDB };
export { getDB, backupDB, restoreDB, eraseDB };

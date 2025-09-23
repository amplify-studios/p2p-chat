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
  user: CredentialsType[];
  rooms: RoomType[];
  invites: InviteType[];
};

export async function backupDB() {
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
  a.download = 'p2p-chat-backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

export async function eraseDB() {
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

export async function restoreDB(jsonString: string) {
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

  // Use a single transaction for efficiency
  const tx = db.transaction(
    ['messages', 'credentials', 'user', 'rooms', 'invites'],
    'readwrite'
  );

  // Clear existing data first (optional)
  await Promise.all([
    tx.objectStore('messages').clear(),
    tx.objectStore('credentials').clear(),
    tx.objectStore('user').clear(),
    tx.objectStore('rooms').clear(),
    tx.objectStore('invites').clear(),
  ]);

  // Restore messages
  for (const msg of backup.messages) {
    await tx.objectStore('messages').add(msg);
  }

  // Restore credentials
  for (const cred of backup.credentials) {
    await tx.objectStore('credentials').put(cred);
  }

  // Restore user
  for (const u of backup.user) {
    await tx.objectStore('user').add(u);
  }

  // Restore rooms
  for (const room of backup.rooms) {
    await tx.objectStore('rooms').put(room);
  }

  // Restore invites
  for (const invite of backup.invites) {
    await tx.objectStore('invites').put(invite);
  }

  await tx.done;
  console.log('Database restored successfully!');
}

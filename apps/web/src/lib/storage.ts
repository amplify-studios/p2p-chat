import { EncryptedBlockType, EncryptedCredentialsType, EncryptedInviteType, EncryptedMessageType, EncryptedRoomType, EncryptedServerSettingsType } from '@chat/crypto';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = "my-database";
const DB_VERSION = 8;
export const PASSWORD_KEY = "vergina"; // FIXME: randomize based on the userId

export type Collection = 'messages' | 'credentials' | 'user' | 'rooms' | 'invites' | 'blocks' | 'serverSettings';

interface MyDB extends DBSchema {
  messages: {
    key: number;
    value: EncryptedMessageType;
  };
  user: {
    key: number;
    value: EncryptedCredentialsType;
  }
  credentials: {
    key: string;
    value: EncryptedCredentialsType;
  };
  rooms: {
    key: string;
    value: EncryptedRoomType;
  };
  invites: {
    key: string;
    value: EncryptedInviteType;
  };
  blocks: {
    key: number;
    value: EncryptedBlockType;
  };
  serverSettings: {
    key: number;
    value: EncryptedServerSettingsType
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
        db.createObjectStore('blocks', { autoIncrement: true })
        db.createObjectStore('serverSettings', { autoIncrement: false })
      },
    });
  }
  return dbPromise;
}

type Backup = {
  messages: EncryptedMessageType[];
  credentials: EncryptedCredentialsType[];
  user: EncryptedCredentialsType[];
  rooms: EncryptedRoomType[];
  invites: EncryptedInviteType[];
  blocks: EncryptedBlockType[]
  serverSettings: EncryptedServerSettingsType[];
};

async function backupDB(file: string) {
  const db = await getDB();
  const backup: Backup = {
    messages: [],
    credentials: [],
    user: [],
    rooms: [],
    invites: [],
    blocks: [],
    serverSettings: [],
  };

  backup.messages = await db.getAll('messages');
  backup.credentials = await db.getAll('credentials');
  backup.user = await db.getAll('user');
  backup.rooms = await db.getAll('rooms');
  backup.invites = await db.getAll('invites');
  backup.blocks = await db.getAll('blocks');
  backup.serverSettings = await db.getAll('serverSettings');

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  a.click();
  URL.revokeObjectURL(url);
}

async function eraseDB() {
  const db = await getDB();

  const tx = db.transaction(['user', 'messages', 'credentials', 'rooms', 'invites', 'blocks', 'serverSettings'], 'readwrite');
  await Promise.all([
    tx.objectStore('messages').clear(),
    tx.objectStore('credentials').clear(),
    tx.objectStore('user').clear(),
    tx.objectStore('rooms').clear(),
    tx.objectStore('invites').clear(),
    tx.objectStore('blocks').clear(),
    tx.objectStore('serverSettings').clear()
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
    !backup.invites ||
    !backup.blocks ||
    !backup.serverSettings
  ) {
    console.error('Backup JSON is missing required fields');
    return;
  }

  const db = await getDB();

  const tx = db.transaction(
    ['messages', 'credentials', 'user', 'rooms', 'invites', 'blocks', 'serverSettings'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('messages').clear(),
    tx.objectStore('credentials').clear(),
    tx.objectStore('user').clear(),
    tx.objectStore('rooms').clear(),
    tx.objectStore('invites').clear(),
    tx.objectStore('blocks').clear(),
    tx.objectStore('serverSettings').clear(),
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

  for (const block of backup.blocks) {
    await tx.objectStore('blocks').put(block);
  }

  for (const settings of backup.serverSettings) {
    await tx.objectStore('serverSettings').put(settings);
  }

  await tx.done;
  console.log('Database restored successfully!');
}

export type { MyDB };
export { getDB, backupDB, restoreDB, eraseDB };

import { useEffect, useState } from 'react';
import { useDB } from '@/hooks/useDB';
import { BlockType, CredentialsType } from '@chat/core';
import { useAuth } from './useAuth';
import { useToast } from '@/components/local/ToastContext';

export function useBlocks() {
  const { db, getAllDecr, putEncr } = useDB();
  const { key } = useAuth();
  const [blocks, setBlocks] = useState<BlockType[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    if (!db || !key) return;

    (async () => {
      const blocks = (await getAllDecr('blocks', key)) as BlockType[];
      setBlocks(blocks);
    })();
  }, [db, key]);

  const block = async (user: CredentialsType) => {
    if (!key) return;
    if (!db) return;

    if (!user) return;

    const alreadyBlocked = blocks.find((b) => b.userId === user.userId);
    if (alreadyBlocked) {
      showToast(`User alredy blocked`, 'warning');
      return;
    }

    const userToBlock: BlockType = { userId: user.userId, username: user.username };
    await putEncr('blocks', userToBlock, key);
    showToast(`Blocked friend ${user.username}`);
  };

  const unblock = async (block: BlockType) => {
    if (!db || !key) return;

    const tx = db.transaction('blocks', 'readwrite');
    const store = tx.objectStore('blocks');

    let cursor = await store.openCursor();

    while (cursor) {
      const _block = cursor.value;
      if (_block.userId === block.userId) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
    setBlocks((prev) => prev.filter((b) => b.userId !== block.userId));
    const allblocks = (await getAllDecr('blocks', key)) as BlockType[];
    console.log(allblocks);
  };

  return { blocks, block, unblock };
}

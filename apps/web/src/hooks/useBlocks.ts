import { useEffect, useState } from "react";
import { useDB } from "@/hooks/useDB";
import { BlockType } from "@chat/core";
import { useAuth } from "./useAuth";

export function useBlocks() {
  const { db, getAllDecr } = useDB();
  const { key } = useAuth();
  const [blocks, setBlocks] = useState<BlockType[]>([]);

  useEffect(() => {
    if (!db || !key) return;

    (async () => {
      const blocks = (await getAllDecr("blocks", key)) as BlockType[];
      setBlocks(blocks);
    })();
  }, [db, key]);

  const unblock = async (block: BlockType) => {
    if (!db || !key) return;

    const tx = db.transaction("blocks", "readwrite");
    const store = tx.objectStore("blocks");

    let cursor = await store.openCursor();

    while(cursor) {
      const _block = cursor.value;
      if (_block.userId === block.userId) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;
    setBlocks((prev) => prev.filter((b) => b.userId !== block.userId));
    const allblocks = (await getAllDecr("blocks", key)) as BlockType[];
    console.log(allblocks)
  };

  return { blocks, unblock };
}

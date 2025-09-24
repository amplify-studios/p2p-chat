import { useEffect, useState } from "react";
import { useDB } from "@/hooks/useDB";
import { BlockType } from "@chat/core";

export function useBlocks() {
    const { db } = useDB();
    const [blocks, setBlocks] = useState<BlockType[]>([]);

    useEffect(() => {
        if (!db) return;

        const setup = async () => {
            const allblocks = await db.getAll("blocks");
            console.log(allblocks)
            const mapped = allblocks.map(block => ({ userId: block.userId } as BlockType));
            setBlocks(mapped);
        };

        setup();
    }, [db]);

    const unblock = async (block: BlockType) => {
        if (!db) return;

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
        const allblocks = await db.getAll("blocks");
        console.log(allblocks)
    };

    return { blocks, unblock };
}

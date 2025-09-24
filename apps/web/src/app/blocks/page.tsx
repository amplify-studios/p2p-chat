'use client';

import EmptyState from "@/components/local/EmptyState";
import { Button } from "@/components/ui/button";
import { useBlocks } from "@/hooks/useBlocks";

export default function BlocklistPage() {
    const { blocks: currentBlocks, unblock } = useBlocks();

    if (!currentBlocks.length) {
        return <EmptyState msg="No blocked users" />
    }

    return (
        <div className="p-4 max-w-lg mx-auto">
            <h1 className="text-2xl font-bold mb-4 text-center text-foreground">Blocks</h1>
            <ul className="space-y-2">
                {currentBlocks.map((block) => (
                <div
                    key={block.userId}
                    className="p-4 bg-card rounded shadow flex justify-between items-center"
                >
                    <div>
                        <p className="font-medium">{block.userId}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => unblock(block)}>
                            Unblock
                        </Button>
                    </div>
                </div>
                ))}
            </ul>
        </div>
  );
}
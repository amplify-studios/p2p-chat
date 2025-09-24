'use client';

import EmptyState from "@/components/local/EmptyState";
import Loading from "@/components/local/Loading";
import { Button } from "@/components/ui/button";
import { useBlocks } from "@/hooks/useBlocks";
import { usePeers } from "@/hooks/usePeers";

export default function BlocklistPage() {
  const { blocks: currentBlocks, unblock } = useBlocks();
  const { peers, loading } = usePeers();

  if (loading) return <Loading />;

  if (!currentBlocks.length) return <EmptyState msg="No blocked users" />;

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-center text-foreground">Blocked Users</h1>

      <ul className="flex flex-col gap-3">
        {currentBlocks.map((block) => {
          const peer = peers.find((p) => p.id === block.userId);
          return (
            <li
              key={block.userId}
              className="flex justify-between items-center p-4 bg-muted/50 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{peer?.username || 'Unknown User'}</span>
                <span className="text-sm text-primary">{block.userId}</span>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => unblock(block)}
              >
                Unblock
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

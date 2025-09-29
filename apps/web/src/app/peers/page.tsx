'use client';

import { usePeers } from '@/hooks/usePeers';
import { useAuth } from '@/hooks/useAuth';
import EmptyState from '@/components/local/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { EllipsisVertical } from 'lucide-react';
import { useToast } from '@/components/local/ToastContext';
import { useBlocks } from '@/hooks/useBlocks';
import { CredentialsType } from '@chat/core';
import { useDB } from '@/hooks/useDB';
import useClient from '@/hooks/useClient';

export default function Peers() {
  const { user } = useAuth();
  const { peers, friends, setFriends, loading } = usePeers();
  const { showToast } = useToast();
  const { block } = useBlocks();
  const { db } = useDB();
  const client = useClient();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">Loading peers...</p>
      </div>
    );
  }
  if(!client) return <EmptyState msg='No connection to the signaling server' />


  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center text-foreground">Peers</h1>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="all">All Online</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
        </TabsList>

        {/* All peers */}
        <TabsContent value="all">
          {peers.length === 0 ? (
            <EmptyState msg="No peers online" />
          ) : (
            <ul className="space-y-2">
              {peers.map((p) => {
                const isMe = p.id === user?.userId;
                return (
                  <li
                    key={p.id}
                    className={`mb-2 flex justify-between items-center p-3 bg-card rounded shadow transition ${
                      isMe ? 'border-2 border-primary' : 'hover:bg-secondary'
                    }`}
                    onClick={() => (window.location.href = `/new?userId=${p.id}`)}
                  >
                    <div>
                      <p className="font-medium">
                        {p.username || 'Anonymous'}{' '}
                        {isMe && <span className="text-xs text-blue-500 ml-2">(You)</span>}
                      </p>
                      <p className="text-sm text-gray-500">{p.id}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        isMe ? 'text-blue-500' : 'text-green-500'
                      }`}
                    >
                      {isMe ? '● Me' : '● Online'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        {/* Friends only */}
        <TabsContent value="friends">
          {!friends || friends.length === 0 ? (
            <EmptyState msg="No friends added yet" />
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="mb-2 flex justify-between items-center p-3 bg-card rounded shadow hover:bg-secondary"
                >
                  <div>
                    <p className="font-medium">{f.username || 'Anonymous'}</p>
                    <p className="text-sm text-gray-500">{f.id}</p>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <EllipsisVertical />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40">
                      <ul className="flex flex-col space-y-2">
                        <li>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => {
                              // TODO: instantly create a new room since invitation and connection have already happened
                              window.location.href = `/new?userId=${f.id}`;
                            }}
                          >
                            New Chat
                          </Button>
                        </li>
                        <li>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-red-500"
                            onClick={() => {
                              try {
                                db?.delete('credentials', f.id);
                                setFriends((prev) => prev.filter((b) => b.id !== f.id));
                              } catch (err: unknown) {
                                showToast(`Failed to remove friend ${f.username}`);
                              }
                              showToast(`Removed friend ${f.username}`);
                            }}
                          >
                            Remove
                          </Button>
                        </li>
                        <li>
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-red-500"
                            onClick={() => {
                              block({ userId: f.id, username: f.username } as CredentialsType);
                            }}
                          >
                            Block
                          </Button>
                        </li>
                      </ul>
                    </PopoverContent>
                  </Popover>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

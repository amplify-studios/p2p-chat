'use client';

import { usePeers } from "@/hooks/usePeers";
import { useAuth } from "@/hooks/useAuth";
import EmptyState from "@/components/local/EmptyState";
import Link from "next/link";

export default function Peers() {
  const user = useAuth(true);
  const { peers, loading } = usePeers();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">Loading peers...</p>
      </div>
    );
  }

  if (!peers.length) {
    return <EmptyState msg="No peers online" />;
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center text-foreground">Online Peers</h1>
      <ul className="space-y-2">
        {peers.map((p) => {
          const isMe = p.id === user?.userId;

          return (
            <Link key={p.id} href={isMe ? "#" : `/new?userId=${p.id}`}>
              <li
                className={`flex justify-between items-center p-3 bg-card rounded shadow transition ${
                  isMe ? "border-2 border-primary" : "hover:bg-secondary"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {p.username || "Anonymous"} {isMe && <span className="text-xs text-blue-500 ml-2">(You)</span>}
                  </p>
                  <p className="text-sm text-gray-500">{p.id}</p>
                </div>
                <span className={`text-sm font-semibold ${isMe ? "text-blue-500" : "text-green-500"}`}>
                  {isMe ? "● Me" : "● Online"}
                </span>
              </li>
            </Link>
          );
        })}
      </ul>
    </div>
  );
}

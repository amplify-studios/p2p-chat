'use client';

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Settings } from "lucide-react";
import { RoomType } from "@chat/core";
import { useDB } from "@/hooks/useDB";
import Loading from "./Loading";

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [active, setActive] = useState<string>("");
  const db = useDB();

  useEffect(() => {
    if (!db) return;

    const fetchRooms = async () => {
      const allRooms = await db.getAll("rooms");
      setRooms(allRooms);
    };

    fetchRooms();
  }, [db]);

  if(!db) return <Loading />;

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-800 text-white flex flex-col justify-between">
        <div>
          <div className="p-6 text-2xl font-bold border-b border-gray-700">
            <Link
              href={"/"}
            >
              P2P Chat
            </Link>
          </div>

          <nav className="p-4 overflow-y-auto max-h-[calc(100vh-100px)]">
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li key={room.roomId}>
                  <Link
                    href={room.roomId ? `/chat?id=${room.roomId}` : "#"}
                    className={`flex items-center gap-2 p-2 rounded hover:bg-gray-700 ${
                      room.roomId === active ? "bg-gray-700 font-semibold" : ""
                    }`}
                  >
                    {room.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/new"
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-700"
                >
                  <Plus size={20} />
                  <span>New Room</span> {/* optional text, can remove if just icon */}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-700">
          <Link
            href="/settings"
            className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded"
          >
            <Settings size={20} />
            Settings
          </Link>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  );
}

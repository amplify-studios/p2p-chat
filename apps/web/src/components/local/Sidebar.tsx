'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Plus, Settings } from 'lucide-react';
import { useRooms } from '@/hooks/useRooms';
import Loading from './Loading';

interface SidebarProps {
  children: ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const { rooms, activeRoomId } = useRooms();
  // TODO: sort rooms by most recent message

  if (!rooms) return <Loading />;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col justify-between">
        {/* Logo / App Title */}
        <div>
          <div className="p-6 text-2xl font-bold border-b border-secondary">
            <Link href="/">P2P Chat</Link>
          </div>

          {/* Rooms List */}
          <nav className="p-4 overflow-y-auto max-h-[calc(100vh-100px)]">
            <ul className="space-y-2">
              {rooms.map((room) => (
                <li key={room.roomId}>
                  <Link
                    href={`/chat?id=${room.roomId}`}
                    className={`flex items-center gap-2 p-2 rounded hover:bg-secondary${
                      room.roomId === activeRoomId
                        ? 'bg-secondary font-semibold'
                        : ''
                    }`}
                  >
                    {room.name}
                  </Link>
                </li>
              ))}

              {/* New Room */}
              <li>
                <Link
                  href="/new"
                  className="flex items-center gap-2 p-2 rounded hover:bg-secondary"
                >
                  <Plus size={20} />
                  <span>New Room</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Settings at Bottom */}
        <div className="p-4 border-t border-secondary">
          <Link
            href="/settings"
            className="flex items-center gap-2 p-2 hover:bg-secondary rounded"
          >
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-background overflow-auto">{children}</main>
    </div>
  );
}

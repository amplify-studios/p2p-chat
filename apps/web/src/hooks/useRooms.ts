'use client';

import { useState, useEffect } from 'react';
import { RoomType } from '@chat/core';
import { useDB } from '@/hooks/useDB';
import { useSearchParams } from 'next/navigation';

export function useRooms(trigger?: any) {
  const db = useDB();
  const searchParams = useSearchParams();
  const activeRoomId = searchParams?.get('id') ?? '';

  const [rooms, setRooms] = useState<RoomType[]>([]);

  useEffect(() => {
    if (!db) return;

    const fetchRooms = async () => {
      const allRooms = await db.getAll('rooms') ?? [];
      setRooms(allRooms);
    };

    fetchRooms();

    const handler = () => fetchRooms();
    window.addEventListener('storage', handler);

    return () => window.removeEventListener('storage', handler);
  }, [db, trigger]);

  return { rooms, activeRoomId };
}

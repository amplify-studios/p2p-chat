'use client';

import { useState, useEffect } from 'react';
import { RoomType } from '@chat/core';
import { useDB } from '@/hooks/useDB';
import { useSearchParams } from 'next/navigation';
import { useAuth } from './useAuth';

export function useRooms() {
  const { db, getAllDecr } = useDB();
  const { key } = useAuth();
  const searchParams = useSearchParams();
  const activeRoomId = searchParams?.get('id') ?? '';

  const [rooms, setRooms] = useState<RoomType[]>([]);

  useEffect(() => {
    if (!db || !key) return;

    const fetchRooms = async () => {
      const allRooms = await getAllDecr('rooms', key) as RoomType[] ?? [];
      setRooms(allRooms);
    };

    fetchRooms();

    const handler = () => fetchRooms();
    window.addEventListener('storage', handler);

    return () => window.removeEventListener('storage', handler);
  }, [db, key]);

  return { rooms, activeRoomId };
}

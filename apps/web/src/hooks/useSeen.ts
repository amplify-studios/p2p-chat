import { useState, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "./useAuth";
import { useP2P } from "@/contexts/P2PContext";
import { WebRTCConnection } from "@chat/sockets";
import { CredentialsType } from "@chat/core/types";

interface UseSeenProps {
  connected?: boolean;
  user?: any;
  otherUser?: any;
  rooms?: any[];
  roomId?: string | null;
}

export function useSeen({
  connected,
  rooms,
  roomId
}: UseSeenProps) {
    const [seen, setSeen] = useState(false);
    const [connection, setConnection] = useState<WebRTCConnection | undefined>(undefined);
    const { getConnection } = useP2P();
    const { user, key } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeRoomId = useMemo(() => searchParams?.get('id') ?? null, [searchParams]);
    const room = useMemo(() => rooms?.find((r) => r.roomId === roomId) ?? null, [rooms, roomId]);
    const otherUser = useMemo(
      () => room?.keys.find((k: CredentialsType) => k.userId !== user?.userId) ?? null,
      [room, user?.userId],
    );
    

  useEffect(() => {
    if (!otherUser) return;
    const conn = getConnection(otherUser.userId);
    setConnection(conn);
  }, [otherUser, getConnection]);

  // Send opened/closed signals
  useEffect(() => {
    if (!connection || !roomId) return;

    console.log(`pathname: ${pathname}, activeRoomId: ${activeRoomId}`);
    if (pathname !== '/chat' || activeRoomId !== roomId){
      //console.log(`[useSeen] ${user.username} opened the chat.`);
      const payload = JSON.stringify({ type: 'opened', roomId });
      if (connected) connection.send(payload);
    }
    return () => {
      //console.log(`[useSeen] ${user.username} left the chat.`);
      if (connected) {
        connection.send(JSON.stringify({ type: 'closed', roomId }));
      }
      setSeen(false);
    };
  }, [connected, connection, roomId]);

  return { seen, setSeen };
}

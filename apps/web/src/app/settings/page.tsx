'use client';

import Loading from '@/components/local/Loading';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { backupDB } from "@/lib/storage";

export default function Home() {
  const user = useAuth(true);
  if (!user) return <Loading />;

  return (<>
    <h1>Settings</h1>

    <Button
      onClick={backupDB}
    >
      Backup
    </Button>
  </>);
}

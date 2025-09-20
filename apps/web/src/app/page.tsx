'use client';

import Loading from '@/components/local/Loading';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const user = useAuth(true);
  if (!user) return <Loading />;

  return (<>
    <h1>Logged in as {user.username} ({user.userId})</h1>
    Ideas for Home page:<br/>
      - App Name / Logo<br />
      - User Status<br />
      - Online Friend Peers<br />
      - Number of new messages<br />
      - Number of pending invites<br />
  </>);
}

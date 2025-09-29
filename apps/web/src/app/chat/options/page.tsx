import EmptyState from '@/components/local/EmptyState';
import ChatOptionsClient from './ChatOptionsClient';

export default async function ChatOptions({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;

  if (!id) return <EmptyState msg="No room selected" />;

  return (
      <ChatOptionsClient roomId={id}/>
  );
}



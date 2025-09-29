import EmptyState from '@/components/local/EmptyState';
import ChatClient from './ChatClient';

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id) return <EmptyState msg="No room selected" />;

  return (
    <div className="flex flex-col h-full min-h-screen">
        <ChatClient roomId={id}/>
    </div>
  );
}

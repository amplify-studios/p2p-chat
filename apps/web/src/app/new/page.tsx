import NewClient from './NewClient';

export default async function New({ searchParams }: { searchParams: Promise<{ userId?: string }> }) {
  const { userId } = await searchParams;

  return (
      <NewClient userId={userId ?? ''}/>
  );
}




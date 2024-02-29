import Room from '@/app/_components/Room';

export default async function Page({ 
  params 
}: { 
  params: { id: string }
}) {
  return <Room roomId={params.id} />
}

import { useGuideTrips } from '@/hooks/useGuideGuard';
import { guideTripCounts } from '@/lib/guidePortal';
export default function GuideDashboard() {
  const { data = [], isPending, error, guard } = useGuideTrips();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const counts = guideTripCounts(data, today);
  return <section className="p-6 space-y-4">
    <h1 className="text-2xl font-bold">Roteiros atribuídos {guard.name ? `a ${guard.name}` : ''}</h1>
    {!guard.guideId ? <p>Selecione um guia para visualizar a prévia.</p> : error ? <p role="alert">Não foi possível carregar os roteiros.</p> : isPending ? <p>Carregando...</p> : <>
      <p>Datas encerradas: {counts.past}</p><p>Em andamento ou futuros: {counts.upcoming}</p><p>Sem data definida: {counts.undated}</p>
      <p className="text-muted-foreground">As contagens refletem as datas dos roteiros atribuídos; não comprovam execução nem aceite do guia.</p>
    </>}
  </section>;
}

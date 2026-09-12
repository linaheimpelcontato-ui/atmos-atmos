import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuideTrips } from '@/hooks/useGuideGuard';
import { guideDate, parseGuideAmount } from '@/lib/guidePortal';
import { Button } from '@/components/ui/button';
const db = supabase as any;
function PersonalCosts({ proposalId, guideId, userId, preview }: { proposalId: string; guideId: string; userId: string; preview: boolean }) {
  const client = useQueryClient();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const key = ['guide-personal-costs', userId, guideId, proposalId];
  const costs = useQuery({ queryKey: key, enabled: !preview, queryFn: async () => {
    const { data, error } = await db.from('guide_trip_costs').select('id,description,amount').eq('guide_id', guideId).eq('proposal_id', proposalId);
    if (error) throw error;
    return data as { id: string; description: string; amount: number }[];
  }});
  const add = useMutation({ mutationFn: async () => {
    if (preview || !description.trim()) throw new Error('Informe a descrição.');
    const parsed = parseGuideAmount(amount);
    const { error } = await db.from('guide_trip_costs').insert({ guide_id: guideId, proposal_id: proposalId, description: description.trim(), amount: parsed });
    if (error) throw error;
  }, onSuccess: () => { setDescription(''); setAmount(''); client.invalidateQueries({ queryKey: key }); }});
  const remove = useMutation({ mutationFn: async (id: string) => {
    if (preview) throw new Error('Prévia somente para leitura.');
    const { data, error } = await db.from('guide_trip_costs').delete().eq('id',id).eq('guide_id',guideId).eq('proposal_id',proposalId).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('Registro não excluído. Atualize a página e tente novamente.');
  }, onSuccess: () => client.invalidateQueries({ queryKey: key }) });
  if (preview) return <p>Custos pessoais indisponíveis na prévia administrativa.</p>;
  return <div className="space-y-2 border-t pt-3">
    <h3 className="font-semibold">Meus custos pessoais</h3>
    {costs.error ? <p role="alert">Falha ao carregar custos pessoais.</p> : costs.isPending ? <p>Carregando custos...</p> : costs.data?.map(c => <div key={c.id}>{c.description}: {Number(c.amount).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} <Button variant="outline" disabled={remove.isPending} onClick={() => { if (window.confirm('Excluir este custo pessoal?')) remove.mutate(c.id); }}>Excluir</Button></div>)}
    <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); add.mutate(); }}>
      <input aria-label="Descrição do custo" className="border p-2" value={description} onChange={e=>setDescription(e.target.value)} required maxLength={500}/>
      <input aria-label="Valor do custo" className="border p-2" inputMode="decimal" placeholder="123,45" value={amount} onChange={e=>setAmount(e.target.value)} required/>
      <Button disabled={add.isPending}>Registrar custo</Button>
    </form>
    {(add.error || remove.error) && <p role="alert">{(add.error || remove.error)?.message}</p>}
  </div>;
}
export default function GuideAgenda() {
  const { data = [], isPending, error, guard } = useGuideTrips();
  return <section className="p-6 space-y-4">
    <h1 className="text-2xl font-bold">Minha agenda</h1>
    <div className="space-x-2"><Button disabled>Aceitar</Button><Button disabled>Recusar</Button><Button disabled>Bloquear data</Button></div>
    <p>Respostas e bloqueios de disponibilidade ainda não podem ser registrados neste portal. Combine sua disponibilidade diretamente com a equipe; nenhuma notificação é enviada aqui.</p>
    {!guard.guideId ? <p>Selecione um guia para visualizar a prévia.</p> : error ? <p role="alert">Não foi possível carregar a agenda.</p> : isPending ? <p>Carregando...</p> : !data.length ? <p>Nenhum roteiro atribuído disponível.</p> : data.map(p => <article className="border rounded-lg p-4 space-y-3" key={p.id}>
      <h2 className="font-semibold">Roteiro {p.code || 'sem código'}</h2>
      <p>Status da proposta: {p.status} · {p.num_people ?? '—'} pessoas</p>
      <p>{guideDate(p.start_date)}{p.end_date ? ` até ${guideDate(p.end_date)}` : ''}</p>
      <ul>{p.items.map((item,index)=><li key={index}>Dia {item.day_number}: {item.item_name || item.category} {item.start_time ? `(${item.start_time}${item.end_time ? `–${item.end_time}` : ''})` : ''}</li>)}</ul>
      <PersonalCosts key={`${guard.userId}:${guard.guideId}:${p.id}`} proposalId={p.id} guideId={guard.guideId!} userId={guard.userId!} preview={guard.isPreview}/>
    </article>)}
  </section>;
}

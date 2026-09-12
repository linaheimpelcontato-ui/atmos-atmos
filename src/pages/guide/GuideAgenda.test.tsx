import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import GuideAgenda from './GuideAgenda';
const state=vi.hoisted(()=>({from:vi.fn(),result:{data:[{id:'p',code:'ATMOS-1',status:'approved',start_date:'2026-09-11',end_date:null,num_people:18,items:[{day_number:1,item_name:'Cachoeira',category:'Atrativo',start_time:'08:30',end_time:'10:00'}]}],isPending:false,error:null,guard:{guideId:'g',userId:'admin',isPreview:true}}}));
vi.mock('@/hooks/useGuideGuard',()=>({useGuideTrips:()=>state.result}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:state.from}}));
afterEach(cleanup);
it('renders operational itinerary with honest disabled responses and no costs query in preview',()=>{
  render(<QueryClientProvider client={new QueryClient()}><GuideAgenda/></QueryClientProvider>);
  expect(screen.getByText('Roteiro ATMOS-1')).toBeInTheDocument();
  expect(screen.getByText(/Dia 1: Cachoeira/)).toHaveTextContent('08:30–10:00');
  expect(screen.getByText('11/09/2026')).toBeInTheDocument();
  for(const label of ['Aceitar','Recusar','Bloquear data']) expect(screen.getByRole('button',{name:label})).toBeDisabled();
  expect(screen.getByText(/nenhuma notificação é enviada aqui/)).toBeInTheDocument();
  expect(state.from).not.toHaveBeenCalled();
});

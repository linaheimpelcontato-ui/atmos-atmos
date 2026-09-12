type CatalogQuery = { isPending: boolean; isError: boolean; data?: unknown[]; refetch: () => unknown };

export function CatalogStatus({ queries }: { queries: CatalogQuery[] }) {
  if (queries.some(q => q.isError)) return (
    <div role="alert" className="mx-4 mt-24 rounded border p-4 text-center bg-background">
      <p>Não foi possível carregar o catálogo. Tente novamente em instantes.</p>
      <button type="button" className="mt-2 underline" onClick={() => queries.forEach(q => { void q.refetch(); })}>Tentar novamente</button>
    </div>
  );
  if (queries.some(q => q.isPending)) return <p role="status" className="pt-24 text-center">Carregando catálogo…</p>;
  if (queries.every(q => q.data?.length === 0)) return <p role="status" className="pt-24 text-center">Nenhum produto disponível no momento.</p>;
  return null;
}

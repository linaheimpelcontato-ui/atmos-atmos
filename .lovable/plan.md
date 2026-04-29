

## Remover "Dia X" do h3, manter apenas a data

### Problema
No banner de cada dia, o h3 mostra `20/08/26 — Dia 3` (modo view) e `20/08/26 — [input]` (modo edit). O usuário quer apenas a data no h3, sem o "Dia X" branco. O subtítulo dourado "DIA 3" e o número grande "03" já ficam.

### Mudança

**Arquivo**: `src/pages/ProposalPublic.tsx`

**Modo view (linha 1023-1025)**: Mostrar apenas `dateStr` quando existir, senão `dayLabel` como fallback:
```typescript
{dateStr || dayLabel}
```

**Modo edit (linha 1013-1020)**: Remover o prefixo `dateStr —` e o input do label. Mostrar apenas a data:
```typescript
<h3 className="text-xl md:text-2xl font-bold text-white leading-tight">
  {dateStr || dayLabel}
</h3>
```

Se o usuário ainda quiser editar o label do dia, manter o input mas sem o "— Dia X" default. Porém pela screenshot, parece que quer apenas a data fixa sem input editável.


'use client';

import { useQuery } from '@tanstack/react-query';
import { apiJson } from '@/lib/api';

export default function IconsReportPage() {
  const report = useQuery({
    queryKey: ['icons'],
    queryFn: () => apiJson<{ total: number; dedicated: number; fallbacks: number }>('/api/bff/dev/icons'),
  });
  if (report.isLoading) return <p>Chargement…</p>;
  const data = report.data;
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Illustrations</h1>
      <div className="glass grid gap-4 rounded-[28px] p-5 sm:grid-cols-3">
        <Stat label="Ingrédients" value={data?.total ?? 0} />
        <Stat label="Icônes dédiées" value={data?.dedicated ?? 0} />
        <Stat label="Fallbacks" value={data?.fallbacks ?? 0} />
      </div>
      <p className="text-sm text-stone-500">
        Cascade : illustration dédiée, sinon sous-catégorie, sinon catégorie. Assets originaux Cuisinons, pas de scrape.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

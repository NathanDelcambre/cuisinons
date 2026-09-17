'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { Meter, PageHeader, Panel, Skeleton } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';

export default function IconsReportPage() {
  const report = useQuery({
    queryKey: ['icons'],
    queryFn: () => apiJson<{ total: number; dedicated: number; fallbacks: number }>('/api/bff/dev/icons'),
  });
  const data = report.data;

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors duration-200 ease-out-soft hover:text-ink-900"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Profil
      </Link>

      <PageHeader
        title="Illustrations"
        description="Cascade appliquée : illustration dédiée, sinon sous-catégorie, sinon catégorie. Tous les visuels sont des originaux Cuisinons."
      />

      {report.isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <Panel className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-3">
            <Stat label="Ingrédients" value={data?.total ?? 0} />
            <Stat label="Icônes dédiées" value={data?.dedicated ?? 0} />
            <Stat label="Replis" value={data?.fallbacks ?? 0} />
          </dl>
          <Meter
            label="Couverture par une icône dédiée"
            value={data?.dedicated ?? 0}
            target={data?.total ?? null}
            unit="ingrédients"
          />
        </Panel>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="tabular mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink-900">
        {value}
      </dd>
    </div>
  );
}

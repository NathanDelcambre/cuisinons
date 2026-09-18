'use client';

import { Archive, Coffee, Layers, Refrigerator, Snowflake, type LucideIcon } from 'lucide-react';
import { STORAGE_AREA_LABELS, STORAGE_AREAS, type StorageArea } from '@cuisinons/shared';
import type { SelectOption } from '@cuisinons/ui';

export const STORAGE_AREA_ICONS: Record<StorageArea, LucideIcon> = {
  FRIDGE: Refrigerator,
  FREEZER: Snowflake,
  PANTRY: Archive,
  BREAKFAST: Coffee,
  OTHER: Layers,
};

export function StorageAreaIcon({
  area,
  className,
}: {
  area: StorageArea;
  className?: string;
}) {
  const Icon = STORAGE_AREA_ICONS[area];
  return <Icon className={className} aria-hidden />;
}

export function storageAreaOptions(): Array<SelectOption<StorageArea>> {
  return STORAGE_AREAS.map((value) => ({
    value,
    label: STORAGE_AREA_LABELS[value],
    icon: <StorageAreaIcon area={value} className="size-4" />,
  }));
}

'use client';

import {
  QUANTITY_UNITS,
  UNIT_LABELS,
  type QuantityUnit,
  type StorageArea,
  type UxCategory,
} from '@cuisinons/shared';
import { Field, Input, Select } from '@cuisinons/ui';
import { storageAreaOptions } from '@/components/storage-area-icon';

const UNIT_OPTIONS = QUANTITY_UNITS.map((value) => ({ value, label: UNIT_LABELS[value] }));

export type PickedIngredient = {
  id: string;
  nameFr: string;
  iconUrl: string | null;
  uxCategory: UxCategory;
};

/**
 * Champs quantité / unité / rangement, sans overlay : l’étape vit dans le
 * picker pour ne pas enchaîner deux modales.
 */
export function QuantityFields({
  quantity,
  unit,
  area,
  withArea = false,
  error = null,
  onQuantity,
  onUnit,
  onArea,
}: {
  quantity: string;
  unit: QuantityUnit;
  area: StorageArea;
  withArea?: boolean;
  error?: string | null;
  onQuantity: (next: string) => void;
  onUnit: (next: QuantityUnit) => void;
  onArea: (next: StorageArea) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Quantité">
        {({ id }) => (
          <Input
            id={id}
            autoFocus
            inputMode="decimal"
            value={quantity}
            onChange={(e) => onQuantity(e.target.value)}
          />
        )}
      </Field>
      <Field label="Unité">
        {({ id }) => <Select id={id} value={unit} options={UNIT_OPTIONS} onChange={onUnit} />}
      </Field>
      {withArea ? (
        <Field label="Rangement" className="sm:col-span-2">
          {({ id }) => <Select id={id} value={area} options={storageAreaOptions()} onChange={onArea} />}
        </Field>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-tomato-500 sm:col-span-2">
          {error}
        </p>
      ) : null}
    </div>
  );
}

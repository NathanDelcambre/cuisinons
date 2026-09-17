'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
  QUANTITY_UNITS,
  STORAGE_AREAS,
  STORAGE_AREA_LABELS,
  UNIT_LABELS,
  defaultStorageArea,
  type QuantityUnit,
  type StorageArea,
  type UxCategory,
} from '@cuisinons/shared';
import { Button, Field, Input, Modal, Select } from '@cuisinons/ui';

const UNIT_OPTIONS = QUANTITY_UNITS.map((value) => ({ value, label: UNIT_LABELS[value] }));
const AREA_OPTIONS = STORAGE_AREAS.map((value) => ({ value, label: STORAGE_AREA_LABELS[value] }));

export type PickedIngredient = {
  id: string;
  nameFr: string;
  iconUrl: string | null;
  uxCategory: UxCategory;
};

/**
 * Deuxieme temps de l'ajout manuel : l'ingredient est choisi, il reste la
 * quantite. La zone de rangement n'apparait que pour le stock, la liste de
 * courses n'en ayant pas besoin.
 */
export function QuantityDialog({
  ingredient,
  withArea = false,
  pending = false,
  onConfirm,
  onClose,
}: {
  ingredient: PickedIngredient | null;
  withArea?: boolean;
  pending?: boolean;
  onConfirm: (input: { quantity: number; unit: QuantityUnit; area?: StorageArea }) => void;
  onClose: () => void;
}) {
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<QuantityUnit>('G');
  const [area, setArea] = useState<StorageArea>('PANTRY');

  useEffect(() => {
    if (!ingredient) return;
    setQuantity('100');
    setUnit('G');
    setArea(defaultStorageArea(ingredient.uxCategory));
  }, [ingredient]);

  const parsed = Number(quantity.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0;

  return (
    <Modal
      open={ingredient !== null}
      title={ingredient?.nameFr ?? ''}
      description="Quantité à enregistrer"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            icon={Check}
            disabled={!valid}
            loading={pending}
            onClick={() => onConfirm({ quantity: parsed, unit, area: withArea ? area : undefined })}
          >
            Ajouter
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantité">
          {({ id }) => (
            <Input
              id={id}
              autoFocus
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          )}
        </Field>
        <Field label="Unité">
          {({ id }) => <Select id={id} value={unit} options={UNIT_OPTIONS} onChange={setUnit} />}
        </Field>
        {withArea ? (
          <Field label="Rangement" className="sm:col-span-2">
            {({ id }) => <Select id={id} value={area} options={AREA_OPTIONS} onChange={setArea} />}
          </Field>
        ) : null}
      </div>
    </Modal>
  );
}

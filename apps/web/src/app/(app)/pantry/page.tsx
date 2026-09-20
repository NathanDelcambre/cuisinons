'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, Pencil, Plus, Refrigerator, Trash2, X } from 'lucide-react';
import {
  STORAGE_AREAS,
  STORAGE_AREA_LABELS,
  UNIT_LABELS,
  type QuantityUnit,
  type StorageArea,
  type UxCategory,
} from '@cuisinons/shared';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { IngredientIcon } from '@/components/ingredient-icon';
import { StorageAreaIcon, storageAreaOptions } from '@/components/storage-area-icon';
import { PantryProductPicker } from '@/components/pantry-product-picker';

type PantryItem = {
  id: string;
  area: StorageArea;
  quantity: number;
  unit: QuantityUnit;
  ingredient: { id: string; nameFr: string; iconUrl: string | null; uxCategory: UxCategory };
  product: {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    packageQuantity: number | null;
    packageUnit: string | null;
    nutriScore: string | null;
    isActive: boolean;
  };
};

export default function PantryPage() {
  const queryClient = useQueryClient();
  const [picker, setPicker] = useState(false);

  const pantry = useQuery({
    queryKey: ['pantry'],
    queryFn: () => apiJson<PantryItem[]>('/api/bff/pantry'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['pantry'] });
    void queryClient.invalidateQueries({ queryKey: ['provisions-summary'] });
  };

  const add = useMutation({
    mutationFn: (input: { productBarcode: string; quantity: number; area?: StorageArea }) =>
      apiJson('/api/bff/pantry/items', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      setPicker(false);
      void refresh();
    },
  });

  const patch = useMutation({
    mutationFn: (input: { id: string; quantity?: number; area?: StorageArea }) =>
      apiJson(`/api/bff/pantry/items/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: input.quantity, area: input.area }),
      }),
    onSuccess: () => void refresh(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiJson(`/api/bff/pantry/items/${id}`, { method: 'DELETE' }),
    onSuccess: () => void refresh(),
  });

  const items = pantry.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réserves"
        description="Ton stock personnel. Il se remplit quand tu valides tes courses et se vide quand tu consommes un repas."
        actionsBesideTitle
        actions={
          <Button variant="glass" icon={Plus} onClick={() => setPicker(true)}>
            Ajouter
          </Button>
        }
      />

      {pantry.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Refrigerator}
          title="Réserves vides"
          description="Ajoute ce que tu as déjà, ou valide une liste de courses pour remplir le stock."
          action={
            <Button icon={Plus} onClick={() => setPicker(true)}>
              Ajouter un produit
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {STORAGE_AREAS.map((area) => {
            const rows = items.filter((item) => item.area === area);
            if (rows.length === 0) return null;
            return (
              // L'ancre permet a la sidebar de pointer directement sur la zone.
              <section key={area} id={area} className="scroll-mt-24 space-y-2">
                <h2 className="flex items-center gap-2 px-1">
                  <StorageAreaIcon area={area} className="size-5 text-ink-500" />
                  <span className="font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">
                    {STORAGE_AREA_LABELS[area]}
                  </span>
                  <span className="tabular text-sm text-ink-500">{rows.length}</span>
                </h2>
                {rows.map((item) => (
                  <PantryRow
                    key={item.id}
                    item={item}
                    onSave={(input) => patch.mutateAsync({ id: item.id, ...input })}
                    onRemove={() => remove.mutate(item.id)}
                  />
                ))}
              </section>
            );
          })}
        </div>
      )}

      <PantryProductPicker
        open={picker}
        pending={add.isPending}
        error={add.error instanceof Error ? add.error.message : null}
        onClose={() => {
          add.reset();
          setPicker(false);
        }}
        onConfirm={(input) => add.mutate(input)}
      />
    </div>
  );
}

function PantryRow({
  item,
  onSave,
  onRemove,
}: {
  item: PantryItem;
  onSave: (input: { quantity: number; area: StorageArea }) => Promise<unknown>;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [area, setArea] = useState<StorageArea>(item.area);
  const name = item.product.name;
  const image = item.product.imageUrl ?? item.ingredient.iconUrl;

  const startEditing = () => {
    setQuantity(String(item.quantity));
    setArea(item.area);
    setEditing(true);
  };

  const cancelEditing = () => {
    setQuantity(String(item.quantity));
    setArea(item.area);
    setEditing(false);
  };

  const save = async () => {
    const nextQuantity = Number(quantity.replace(',', '.'));
    if (!Number.isFinite(nextQuantity) || nextQuantity < 0) return;
    setSaving(true);
    try {
      await onSave({ quantity: nextQuantity, area });
      setEditing(false);
    } catch {
      // La mutation conserve son erreur et la ligne reste ouverte pour permettre une nouvelle tentative.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-center gap-3 py-3">
      <IngredientIcon src={image} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-ink-900">{name}</span>
        {item.product.brand ? (
          <span className="mt-0.5 block truncate text-xs text-ink-500">
            {item.product.brand} · OpenFoodFacts
          </span>
        ) : null}
      </span>
      {editing ? (
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <Select
            className="h-11 min-h-11 min-w-0 flex-1 pl-3 text-[13px] sm:w-44 sm:flex-none sm:shrink-0"
            value={area}
            options={storageAreaOptions()}
            aria-label={`Rangement de ${name}`}
            onChange={setArea}
          />

          <Input
            className="tabular h-11 w-20 px-2 text-right"
            inputMode="decimal"
            value={quantity}
            aria-label={`Quantité de ${name}`}
            onChange={(event) => setQuantity(event.target.value)}
          />
          <span className="w-10 shrink-0 text-xs text-ink-500">{UNIT_LABELS[item.unit]}</span>

          <IconButton
            icon={Check}
            label={`Enregistrer ${name}`}
            size="sm"
            disabled={saving}
            onClick={() => void save()}
          />
          <IconButton
            icon={X}
            label="Annuler"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={cancelEditing}
          />
        </div>
      ) : (
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <span className="min-w-0 flex-1 truncate text-xs text-ink-500 sm:w-44 sm:flex-none">
            {STORAGE_AREA_LABELS[item.area]}
          </span>
          <span className="tabular whitespace-nowrap text-sm text-ink-700">
            {item.quantity} {UNIT_LABELS[item.unit]}
          </span>
          <IconButton
            icon={Pencil}
            label={`Modifier ${name}`}
            size="sm"
            variant="ghost"
            onClick={startEditing}
          />
          <IconButton
            icon={Trash2}
            label={`Retirer ${name}`}
            size="sm"
            variant="ghost"
            onClick={onRemove}
          />
        </div>
      )}
    </Card>
  );
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Check, Pencil, Plus, Refrigerator, Trash2, X } from 'lucide-react';
import {
  STORAGE_AREAS,
  STORAGE_AREA_LABELS,
  compactProductBrand,
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
  cn,
  transitions,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { Avatar } from '@/components/avatar';
import { IngredientIcon } from '@/components/ingredient-icon';
import { StorageAreaIcon, storageAreaOptions } from '@/components/storage-area-icon';
import { PantryProductPicker } from '@/components/pantry-product-picker';

type HouseholdUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [picker, setPicker] = useState(false);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const household = useQuery({
    queryKey: ['users'],
    queryFn: () => apiJson<HouseholdUser[]>('/api/bff/users'),
  });
  const selectedId = viewUserId ?? user?.id;
  const selected = household.data?.find((member) => member.id === selectedId);
  const isSelf = !viewUserId || viewUserId === user?.id;

  const pantry = useQuery({
    queryKey: ['pantry', selectedId],
    queryFn: () =>
      apiJson<PantryItem[]>(
        `/api/bff/pantry${isSelf || !selectedId ? '' : `?userId=${encodeURIComponent(selectedId)}`}`,
      ),
    enabled: Boolean(selectedId),
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
  const otherName = selected?.displayName ?? 'l’autre';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réserves"
        description={
          isSelf
            ? 'Ton stock personnel. Il se remplit quand tu valides tes courses et se vide quand tu consommes un repas.'
            : `Les réserves de ${otherName}.`
        }
        actionsBesideTitle
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {household.data && household.data.length > 1 && selectedId ? (
              <PersonSwitch
                people={household.data}
                selectedId={selectedId}
                onChange={(id) => {
                  setPicker(false);
                  setViewUserId(id);
                }}
              />
            ) : null}
            {isSelf ? (
              <Button variant="glass" icon={Plus} onClick={() => setPicker(true)}>
                Ajouter
              </Button>
            ) : null}
          </div>
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
          description={
            isSelf
              ? 'Ajoute ce que tu as déjà, ou valide une liste de courses pour remplir le stock.'
              : `${otherName} n’a rien en réserve.`
          }
          action={
            isSelf ? (
              <Button icon={Plus} onClick={() => setPicker(true)}>
                Ajouter un produit
              </Button>
            ) : null
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
                    readOnly={!isSelf}
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

function PersonSwitch({
  people,
  selectedId,
  onChange,
}: {
  people: HouseholdUser[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Personne" className="segmented-track inline-flex rounded-full p-[3px]">
      {people.map((person) => {
        const active = person.id === selectedId;
        return (
          <button
            key={person.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(person.id)}
            className={cn(
              'relative flex min-h-9 items-center gap-1.5 rounded-full py-0.5 pl-1 pr-3 text-[13px] font-medium transition-colors duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
              active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {active ? (
              <motion.span
                layoutId="pantry-person"
                transition={transitions.spring}
                className="segmented-thumb absolute inset-0 rounded-full"
              />
            ) : null}
            <Avatar
              name={person.displayName}
              src={person.avatarUrl}
              className={cn(
                'relative size-6 rounded-full text-[10px] transition-opacity duration-200 ease-out-soft',
                active ? 'opacity-100' : 'opacity-70',
              )}
            />
            <span className="relative">{person.displayName}</span>
          </button>
        );
      })}
    </div>
  );
}

function PantryRow({
  item,
  readOnly = false,
  onSave,
  onRemove,
}: {
  item: PantryItem;
  readOnly?: boolean;
  onSave: (input: { quantity: number; area: StorageArea }) => Promise<unknown>;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [area, setArea] = useState<StorageArea>(item.area);
  const name = item.product.name;
  const brand = compactProductBrand(item.product.brand);
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
    <Card className="space-y-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <IngredientIcon src={image} />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm leading-snug text-ink-900">{name}</span>
          {brand ? (
            <span className="mt-0.5 block truncate text-xs text-ink-500">{brand}</span>
          ) : null}
          {!editing ? (
            <span className="tabular mt-1 block whitespace-nowrap text-sm text-ink-700">
              {item.quantity} {UNIT_LABELS[item.unit]}
            </span>
          ) : null}
        </span>
        {readOnly ? null : (
        <div className="flex shrink-0 items-center gap-1">
          {editing ? (
            <>
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        )}
      </div>

      {editing && !readOnly ? (
        <div className="flex w-full min-w-0 items-end gap-2">
          <div className="grid min-w-0 flex-1 gap-1">
            <span className="px-1 text-[11px] font-medium text-ink-500">Emplacement</span>
            <Select
              className="h-11 min-h-11 w-full min-w-0 pl-3 text-[13px]"
              value={area}
              options={storageAreaOptions()}
              aria-label={`Emplacement de ${name}`}
              onChange={setArea}
            />
          </div>

          <div className="grid w-28 shrink-0 gap-1">
            <span className="truncate px-1 text-[11px] font-medium text-ink-500">Quantité restante</span>
            <div className="flex min-w-0 items-center gap-2">
              <Input
                className="tabular h-11 min-w-0 flex-1 px-2 text-right"
                inputMode="decimal"
                value={quantity}
                aria-label={`Quantité restante de ${name}`}
                onChange={(event) => setQuantity(event.target.value)}
              />
              <span className="shrink-0 text-xs text-ink-500">{UNIT_LABELS[item.unit]}</span>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

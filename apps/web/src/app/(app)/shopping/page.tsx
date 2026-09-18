'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Check,
  ListChecks,
  Plus,
  ShoppingBasket,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  UNIT_LABELS,
  UX_CATEGORY_LABELS,
  kitchenLabel,
  type QuantityUnit,
  type UxCategory,
} from '@cuisinons/shared';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Panel,
  Skeleton,
  cn,
} from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { IngredientPicker } from '@/components/ingredient-picker';
import { IngredientIcon } from '@/components/ingredient-icon';
import { QuantityDialog, type PickedIngredient } from '@/components/quantity-dialog';
import {
  GenerateShoppingModal,
  type GenerateShoppingInput,
} from '@/components/generate-shopping-modal';
import { CategoryIcon } from '@/components/category-icon';

type ShoppingItem = {
  id: string;
  quantity: number;
  unit: QuantityUnit;
  origin: 'PLANNER' | 'MANUAL';
  checked: boolean;
  ingredient: { id: string; nameFr: string; iconUrl: string | null; uxCategory: UxCategory };
};

type ShoppingList = {
  id: string;
  fromDate: string | null;
  toDate: string | null;
  items: ShoppingItem[];
} | null;

export default function ShoppingPage() {
  const queryClient = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [picked, setPicked] = useState<PickedIngredient | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['shopping'],
    queryFn: () => apiJson<ShoppingList>('/api/bff/shopping/list'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['shopping'] });
    void queryClient.invalidateQueries({ queryKey: ['pantry'] });
  };

  const generate = useMutation({
    mutationFn: (body: GenerateShoppingInput) =>
      apiJson<ShoppingList>('/api/bff/shopping/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['shopping'], data);
      setGenerateOpen(false);
      setNotice(
        data && data.items.length > 0
          ? null
          : 'Rien à acheter : tes réserves couvrent déjà les repas prévus.',
      );
    },
  });

  const patch = useMutation({
    mutationFn: (input: { id: string; quantity?: number; checked?: boolean }) =>
      apiJson<ShoppingList>(`/api/bff/shopping/items/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: input.quantity, checked: input.checked }),
      }),
    onSuccess: (data) => queryClient.setQueryData(['shopping'], data),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiJson<ShoppingList>(`/api/bff/shopping/items/${id}`, { method: 'DELETE' }),
    onSuccess: (data) => queryClient.setQueryData(['shopping'], data),
  });

  // Chaque requete renvoie la liste entiere : lancees en parallele, la derniere
  // reponse arrivee pourrait etre la plus ancienne. On relit donc la liste une
  // fois tous les cochages confirmes.
  const checkAll = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(
        ids.map((id) =>
          apiJson(`/api/bff/shopping/items/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ checked: true }),
          }),
        ),
      );
      return apiJson<ShoppingList>('/api/bff/shopping/list');
    },
    onSuccess: (data) => queryClient.setQueryData(['shopping'], data),
  });

  const add = useMutation({
    mutationFn: (input: { ingredientId: string; quantity: number; unit: QuantityUnit }) =>
      apiJson<ShoppingList>('/api/bff/shopping/items', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['shopping'], data);
      setPicked(null);
    },
  });

  const validate = useMutation({
    mutationFn: () => apiJson<{ added: number }>('/api/bff/shopping/validate', { method: 'POST' }),
    onSuccess: (data) => {
      refresh();
      setNotice(`${String(data.added)} ingrédient(s) ajouté(s) à tes réserves.`);
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const items = list.data?.items ?? [];
  const checked = items.filter((item) => item.checked);

  // Regroupement par categorie : on fait ses courses par rayon, pas par ordre
  // d'apparition dans les recettes.
  const groups = new Map<UxCategory, ShoppingItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.ingredient.uxCategory) ?? [];
    bucket.push(item);
    groups.set(item.ingredient.uxCategory, bucket);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Courses"
        description="Générée depuis ton planning, à partir de ce qu'il te manque vraiment."
        actionsBesideTitle
        actionsClassName="flex flex-wrap items-center justify-end gap-2 max-sm:w-full max-sm:basis-full"
        actions={
          <>
            <Button variant="glass" icon={Plus} onClick={() => setPicker(true)}>
              <span className="sm:hidden">Ajouter</span>
              <span className="hidden sm:inline">Ajouter un article</span>
            </Button>
            <Button variant="accent" icon={Sparkles} onClick={() => setGenerateOpen(true)}>
              Générer mes courses
            </Button>
          </>
        }
      />

      {notice ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          <p className="text-sm text-ink-600">{notice}</p>
          <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>
            Fermer
          </Button>
        </Card>
      ) : null}

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingBasket}
          title="Liste vide"
          description="Génère la liste depuis ton planning, ou ajoute un article à la main."
          action={
            <Button variant="accent" icon={Sparkles} onClick={() => setGenerateOpen(true)}>
              Générer mes courses
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {[...groups.entries()].map(([category, rows]) => (
            <section key={category} className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-sm font-medium text-ink-500">
                <CategoryIcon category={category} className="size-5" />
                {UX_CATEGORY_LABELS[category]}
              </h2>
              {rows.map((item) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  onToggle={() => patch.mutate({ id: item.id, checked: !item.checked })}
                  onQuantity={(quantity) => patch.mutate({ id: item.id, quantity })}
                  onRemove={() => remove.mutate(item.id)}
                />
              ))}
            </section>
          ))}

          <Panel className="sticky bottom-20 flex flex-wrap items-center justify-between gap-3 p-4 lg:bottom-6">
            {/* Une seule chaine : deux noeuds de texte voisins seraient annonces
                « coché s » par un lecteur d'ecran. */}
            <p className="tabular text-sm text-ink-600">
              {`${String(checked.length)} sur ${String(items.length)} coché${checked.length > 1 ? 's' : ''}`}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                icon={ListChecks}
                loading={checkAll.isPending}
                disabled={checked.length === items.length}
                onClick={() =>
                  checkAll.mutate(items.filter((item) => !item.checked).map((item) => item.id))
                }
              >
                Tout cocher
              </Button>
              <Button
                icon={Check}
                loading={validate.isPending}
                disabled={checked.length === 0}
                onClick={() => validate.mutate()}
              >
                J’ai fait les courses
              </Button>
            </div>
          </Panel>
        </div>
      )}

      <GenerateShoppingModal
        open={generateOpen}
        pending={generate.isPending}
        error={generate.error instanceof Error ? generate.error.message : null}
        onClose={() => {
          generate.reset();
          setGenerateOpen(false);
        }}
        onGenerate={(input) => generate.mutate(input)}
      />
      <IngredientPicker
        open={picker}
        onPick={(ingredient) => {
          setPicked(ingredient);
          setPicker(false);
        }}
        onClose={() => setPicker(false)}
      />
      <QuantityDialog
        ingredient={picked}
        pending={add.isPending}
        onClose={() => setPicked(null)}
        onConfirm={({ quantity, unit }) => {
          if (picked) add.mutate({ ingredientId: picked.id, quantity, unit });
        }}
      />
    </div>
  );
}

function ShoppingRow({
  item,
  onToggle,
  onQuantity,
  onRemove,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <Card className={cn('flex flex-wrap items-center gap-3 py-3', item.checked && 'opacity-60')}>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={`${item.checked ? 'Décocher' : 'Cocher'} ${kitchenLabel(item.ingredient.nameFr)}`}
        onClick={onToggle}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border transition duration-200 ease-out-soft',
          item.checked
            ? 'border-sage-500 bg-sage-500 text-white'
            : 'border-ink-300 bg-white/70 hover:border-sage-400',
        )}
      >
        {item.checked ? <Check className="size-3.5" aria-hidden /> : null}
      </button>

      <IngredientIcon src={item.ingredient.iconUrl} />

      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm text-ink-900',
          item.checked && 'line-through',
        )}
      >
        {kitchenLabel(item.ingredient.nameFr)}
      </span>

      {item.origin === 'MANUAL' ? <Badge tone="peach">Ajouté</Badge> : null}

      {/* Corrige la quantite quand le magasin n'a pas le format exact. */}
      <Input
        className="tabular h-11 w-20 px-2 text-right"
        inputMode="decimal"
        defaultValue={String(item.quantity)}
        aria-label={`Quantité de ${kitchenLabel(item.ingredient.nameFr)}`}
        onBlur={(e) => {
          const next = Number(e.target.value.replace(',', '.'));
          if (Number.isFinite(next) && next !== item.quantity) onQuantity(next);
        }}
      />
      <span className="w-12 shrink-0 text-xs text-ink-500">{UNIT_LABELS[item.unit]}</span>

      <IconButton
        icon={Trash2}
        label={`Retirer ${kitchenLabel(item.ingredient.nameFr)}`}
        size="sm"
        variant="ghost"
        onClick={onRemove}
      />
    </Card>
  );
}

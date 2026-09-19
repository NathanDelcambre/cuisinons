'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check, ListChecks, Plus, ShoppingBasket, Sparkles, Trash2 } from 'lucide-react';
import {
  UNIT_LABELS,
  UX_CATEGORY_LABELS,
  RETAILER_LABELS,
  kitchenLabel,
  type QuantityUnit,
  type Retailer,
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
import {
  GenerateShoppingModal,
  type GenerateShoppingInput,
} from '@/components/generate-shopping-modal';
import { CategoryIcon } from '@/components/category-icon';
import { RetailerLogo } from '@/components/retailer-logo';

type ShoppingItem = {
  id: string;
  quantity: number;
  neededQuantity: number;
  unit: QuantityUnit;
  origin: 'PLANNER' | 'MANUAL';
  checked: boolean;
  ingredient: { id: string; nameFr: string; iconUrl: string | null; uxCategory: UxCategory };
  product: {
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    packageQuantity: number | null;
    packageCount: number | null;
    estimatedPrice: number | null;
    currency: string | null;
    priceObservedAt: string | null;
    storeName: string | null;
    economyNote: string | null;
    source: 'OPEN_FOOD_FACTS';
  } | null;
};

type ShoppingList = {
  id: string;
  fromDate: string | null;
  toDate: string | null;
  retailer: Retailer | null;
  economical: boolean;
  items: ShoppingItem[];
} | null;

const EUR_FORMAT = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export default function ShoppingPage() {
  const queryClient = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['shopping'],
    queryFn: () => apiJson<ShoppingList>('/api/bff/shopping/list'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['shopping'] });
    void queryClient.invalidateQueries({ queryKey: ['pantry'] });
    void queryClient.invalidateQueries({ queryKey: ['provisions-summary'] });
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
      setPicker(false);
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
  const pricedItems = items.filter((item) => typeof item.product?.estimatedPrice === 'number');
  const estimatedTotal = pricedItems.reduce(
    (total, item) => total + (item.product?.estimatedPrice ?? 0),
    0,
  );

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
        actionsClassName="flex items-center justify-end gap-2"
        actions={
          <>
            <Button
              variant="glass"
              icon={Plus}
              aria-label="Ajouter un article"
              className="max-sm:size-11 max-sm:p-0"
              onClick={() => setPicker(true)}
            >
              <span className="max-sm:sr-only">Ajouter un article</span>
            </Button>
            <Button
              variant="accent"
              icon={Sparkles}
              aria-label="Générer mes courses"
              className="max-sm:size-11 max-sm:p-0"
              onClick={() => setGenerateOpen(true)}
            >
              <span className="max-sm:sr-only">Générer mes courses</span>
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

      {list.data?.retailer ? (
        <Card className="flex items-center justify-between gap-3 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <RetailerLogo retailer={list.data.retailer} className="size-9 rounded-lg" />
            <p className="min-w-0 text-sm text-ink-700">
              Produits sélectionnés chez{' '}
              <strong className="whitespace-nowrap">{RETAILER_LABELS[list.data.retailer]}</strong>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
              Total estimé
            </p>
            <p className="tabular mt-0.5 font-display text-lg font-semibold text-ink-900">
              {pricedItems.length > 0 ? EUR_FORMAT.format(estimatedTotal) : '—'}
            </p>
          </div>
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

          <Panel className="sticky bottom-20 flex items-center justify-between gap-2 p-3 sm:gap-3 sm:p-4 lg:bottom-6">
            {/* Une seule chaine : deux noeuds de texte voisins seraient annonces
                « coché s » par un lecteur d'ecran. */}
            <p className="tabular min-w-0 text-sm text-ink-600">
              <span className="sm:hidden">{`${String(checked.length)}/${String(items.length)}`}</span>
              <span className="hidden sm:inline">
                {`${String(checked.length)} sur ${String(items.length)} coché${checked.length > 1 ? 's' : ''}`}
              </span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="ghost"
                icon={ListChecks}
                aria-label="Tout cocher"
                title="Tout cocher"
                className="max-sm:size-9 max-sm:p-0"
                loading={checkAll.isPending}
                disabled={checked.length === items.length}
                onClick={() =>
                  checkAll.mutate(items.filter((item) => !item.checked).map((item) => item.id))
                }
              >
                <span className="max-sm:sr-only">Tout cocher</span>
              </Button>
              <Button
                icon={Check}
                size="sm"
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
        onClose={() => {
          add.reset();
          setPicker(false);
        }}
        quantity={{
          pending: add.isPending,
          error: add.error instanceof Error ? add.error.message : null,
          onBack: () => add.reset(),
          onConfirm: (ingredient, { quantity, unit }) => {
            add.mutate({ ingredientId: ingredient.id, quantity, unit });
          },
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
  const name = item.product?.name ?? kitchenLabel(item.ingredient.nameFr);
  const image = item.product?.imageUrl ?? item.ingredient.iconUrl;
  const unit = UNIT_LABELS[item.unit];
  const price =
    item.product?.estimatedPrice !== null && item.product?.estimatedPrice !== undefined
      ? `${item.product.estimatedPrice.toFixed(2).replace('.', ',')} €`
      : 'Prix indisponible';
  return (
    <Card
      className={cn(
        'grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 py-3 sm:flex sm:gap-3 sm:px-5',
        item.checked && 'opacity-60',
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={`${item.checked ? 'Décocher' : 'Cocher'} ${name}`}
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

      <IngredientIcon src={image} className="hidden sm:flex" />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block line-clamp-2 text-sm leading-snug text-ink-900 sm:truncate',
            item.checked && 'line-through',
          )}
        >
          {name}
        </span>
        <span className="tabular mt-1 block text-xs font-medium text-ink-600 sm:hidden">
          {price}
        </span>
        {item.product ? (
          <span className="hidden sm:block">
            <span className="mt-0.5 block text-xs text-ink-500">
              {[item.product.brand, item.product.storeName].filter(Boolean).join(' · ')}
              {item.product.estimatedPrice !== null ? ` · ${price}` : ''}
            </span>
            <span className="mt-0.5 block text-xs text-ink-500">
              Besoin : {String(item.neededQuantity)} {unit} · À acheter : {String(item.quantity)}{' '}
              {unit}
              {item.product.packageCount && item.product.packageQuantity
                ? ` (${String(item.product.packageCount)} × ${String(item.product.packageQuantity)} ${unit})`
                : ''}
              {item.product.priceObservedAt
                ? ` · prix relevé le ${new Intl.DateTimeFormat('fr-FR').format(new Date(item.product.priceObservedAt))}`
                : ''}
            </span>
          </span>
        ) : null}
        {item.product?.economyNote ? (
          <span className="mt-1 hidden text-xs text-sage-700 sm:block">
            {item.product.economyNote}
          </span>
        ) : null}
      </span>

      {item.origin === 'MANUAL' ? (
        <Badge tone="peach" className="hidden sm:inline-flex">
          Ajouté
        </Badge>
      ) : null}

      {/* Corrige la quantite quand le magasin n'a pas le format exact. */}
      <span className="flex shrink-0 items-center gap-1">
        <Input
          className="tabular h-10 w-16 px-2 text-right sm:h-11 sm:w-20"
          inputMode="decimal"
          defaultValue={String(item.quantity)}
          aria-label={`Quantité de ${name}`}
          onBlur={(e) => {
            const next = Number(e.target.value.replace(',', '.'));
            if (Number.isFinite(next) && next !== item.quantity) onQuantity(next);
          }}
        />
        <span className="shrink-0 text-xs text-ink-500 sm:w-12">{unit}</span>
      </span>

      <IconButton
        icon={Trash2}
        label={`Retirer ${name}`}
        size="sm"
        variant="ghost"
        onClick={onRemove}
      />
    </Card>
  );
}

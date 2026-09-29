'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeftRight,
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
  RETAILER_LABELS,
  RETAILERS,
  kitchenLabel,
  compactProductBrand,
  type QuantityUnit,
  type Retailer,
  type UxCategory,
} from '@cuisinons/shared';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  Skeleton,
  Switch,
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
import { ProductSwapModal } from '@/components/product-swap-modal';

type ShoppingItem = {
  id: string;
  quantity: number;
  neededQuantity: number;
  unit: QuantityUnit;
  origin: 'PLANNER' | 'MANUAL';
  checked: boolean;
  bulkSuggestion: { quantity: number; unit: 'PIECE'; label: string } | null;
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

type RetailerEstimate = {
  retailer: Retailer;
  regularTotal: number | null;
  economicalTotal: number | null;
  regularPricedItems: number;
  economicalPricedItems: number;
  totalItems: number;
};

const EUR_FORMAT = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

function itemsSignature(items: ShoppingItem[]) {
  return items
    .map((item) => `${item.id}:${String(item.neededQuantity)}:${item.unit}`)
    .sort()
    .join('|');
}

export default function ShoppingPage() {
  const queryClient = useQueryClient();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [swapItem, setSwapItem] = useState<ShoppingItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['shopping'],
    queryFn: () => apiJson<ShoppingList>('/api/bff/shopping/list'),
  });
  const retailerEstimates = useQuery({
    queryKey: [
      'shopping-retailer-estimates',
      list.data?.id,
      itemsSignature(list.data?.items ?? []),
    ],
    queryFn: () => apiJson<RetailerEstimate[]>('/api/bff/shopping/retailer-estimates'),
    enabled: (list.data?.items.length ?? 0) > 0,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
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

  const changeRetailer = useMutation({
    mutationFn: (input: { retailer: Retailer; economical: boolean }) =>
      apiJson<ShoppingList>('/api/bff/shopping/retailer', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['shopping'], data);
    },
  });

  const patch = useMutation({
    mutationFn: (input: { id: string; checked: boolean }) =>
      apiJson<ShoppingList>(`/api/bff/shopping/items/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ checked: input.checked }),
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
      setNotice(`${String(data.added)} produit(s) ajouté(s) à tes réserves.`);
    },
    onError: (error: Error) => setNotice(error.message),
  });

  const items = list.data?.items ?? [];
  const pendingChoice = changeRetailer.isPending ? changeRetailer.variables : undefined;
  const activeRetailer = pendingChoice?.retailer ?? list.data?.retailer ?? null;
  const activeEconomical = pendingChoice?.economical ?? list.data?.economical ?? true;
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
    <div className="space-y-6 pb-6 lg:pb-16">
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

      {items.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">
              Distributeurs
            </h2>
            <Switch
              checked={activeEconomical}
              disabled={!activeRetailer || changeRetailer.isPending}
              onChange={(next) => {
                if (!activeRetailer) return;
                changeRetailer.mutate({ retailer: activeRetailer, economical: next });
              }}
              label="Faire des économies"
            />
          </div>
          <div
            role="radiogroup"
            aria-label="Distributeur"
            className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1"
          >
            {RETAILERS.map((retailer) => {
              const estimate = retailerEstimates.data?.find((item) => item.retailer === retailer);
              const total = activeEconomical ? estimate?.economicalTotal : estimate?.regularTotal;
              const pricedCount = activeEconomical
                ? estimate?.economicalPricedItems
                : estimate?.regularPricedItems;
              const selected = retailer === activeRetailer;
              return (
                <button
                  key={retailer}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={changeRetailer.isPending}
                  onClick={() => {
                    if (selected && activeEconomical === (list.data?.economical ?? true)) return;
                    changeRetailer.mutate({ retailer, economical: activeEconomical });
                  }}
                  className={cn(
                    'flex min-h-16 min-w-[10.75rem] flex-1 items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition',
                    selected
                      ? 'border-sage-400 bg-sage-50 text-ink-900'
                      : 'border-ink-100 bg-white/70 text-ink-700 hover:border-sage-300',
                  )}
                >
                  <RetailerLogo retailer={retailer} className="size-8 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{RETAILER_LABELS[retailer]}</span>
                    <span className="tabular mt-0.5 block text-xs text-ink-500">
                      {retailerEstimates.isLoading
                        ? 'Calcul…'
                        : total === null || total === undefined
                          ? 'Prix indisponible'
                          : `${EUR_FORMAT.format(total)} estimés`}
                    </span>
                    {estimate && pricedCount !== estimate.totalItems ? (
                      <span className="block text-[10px] text-ink-400">
                        {String(pricedCount ?? 0)}/{String(estimate.totalItems)} produits tarifés
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          {retailerEstimates.isError ? (
            <p className="text-sm text-tomato-500">
              Impossible de calculer les estimations pour le moment.
            </p>
          ) : null}
          {changeRetailer.error instanceof Error ? (
            <p className="text-sm text-tomato-500">{changeRetailer.error.message}</p>
          ) : null}
        </section>
      ) : null}

      {list.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[4.5rem]" />
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
              <div className="overflow-hidden rounded-md bg-[#fffdfb] shadow-[0_0_18px_rgba(28,25,23,0.08)]">
                {rows.map((item, index) => (
                  <ShoppingRow
                    key={item.id}
                    item={item}
                    className={index > 0 ? 'border-t border-ink-200/70' : undefined}
                    onToggle={() => patch.mutate({ id: item.id, checked: !item.checked })}
                    onSwap={() => setSwapItem(item)}
                    canSwap={Boolean(list.data?.retailer)}
                    onRemove={() => remove.mutate(item.id)}
                  />
                ))}
              </div>
            </section>
          ))}

          <ShoppingDock>
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
          </ShoppingDock>
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
      <ProductSwapModal
        itemId={swapItem?.id ?? null}
        ingredientName={swapItem ? kitchenLabel(swapItem.ingredient.nameFr) : ''}
        currentBarcode={swapItem?.product?.barcode ?? null}
        ingredientIconUrl={swapItem?.ingredient.iconUrl ?? null}
        retailer={list.data?.retailer ?? null}
        onClose={() => setSwapItem(null)}
      />
    </div>
  );
}

/**
 * Barre d'actions hors du flux de la page. Le contenu est dans un ancêtre
 * animé (`transform`) et borné en largeur : un `fixed` ou un `sticky` y
 * resterait en retrait. Le portail la cale sur le bas de l'écran, sur toute
 * la largeur utile.
 */
function ShoppingDock({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 bg-[#fffdfb] shadow-[0_-10px_28px_rgba(28,25,23,0.12)] lg:bottom-0 lg:left-[17rem]">
      <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-2 px-4 py-3 sm:px-8">
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ShoppingRow({
  item,
  className,
  onToggle,
  onSwap,
  canSwap,
  onRemove,
}: {
  item: ShoppingItem;
  className?: string;
  onToggle: () => void;
  onSwap: () => void;
  canSwap: boolean;
  onRemove: () => void;
}) {
  const name = item.product?.name ?? kitchenLabel(item.ingredient.nameFr);
  const unit = UNIT_LABELS[item.unit];
  const brand = compactProductBrand(item.product?.brand);
  const price =
    item.product?.estimatedPrice !== null && item.product?.estimatedPrice !== undefined
      ? `${item.product.estimatedPrice.toFixed(2).replace('.', ',')} €`
      : null;
  const purchase =
    item.product !== null
      ? `Besoin : ${String(item.neededQuantity)} ${unit} · À acheter : ${String(item.quantity)} ${unit}${
          item.product.packageCount && item.product.packageQuantity
            ? ` (${String(item.product.packageCount)} × ${String(item.product.packageQuantity)} ${unit})`
            : ''
        }`
      : (item.bulkSuggestion?.label ?? null);
  const secondary = [brand, purchase].filter(Boolean).join(' · ');
  return (
    <div
      className={cn(
        'grid h-[4.5rem] min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-2 px-3 sm:gap-3 sm:px-4',
        item.checked && 'opacity-60',
        className,
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
            : 'border-ink-300 bg-white hover:border-sage-400',
        )}
      >
        {item.checked ? <Check className="size-3.5" aria-hidden /> : null}
      </button>

      <IngredientIcon src={item.ingredient.iconUrl} name={item.ingredient.nameFr} />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm font-semibold leading-tight text-ink-900',
            item.checked && 'line-through',
          )}
        >
          {name}
        </span>
        {secondary ? (
          <span className="mt-0.5 block truncate text-xs leading-tight text-ink-500">{secondary}</span>
        ) : null}
      </span>

      <span className="w-[4.75rem] shrink-0 text-right text-base font-bold tabular-nums leading-none text-ink-900">
        {price ?? ''}
      </span>

      <span className="flex shrink-0 items-center gap-0.5">
        <IconButton
          icon={ArrowLeftRight}
          label={`Échanger ${name}`}
          size="sm"
          variant="ghost"
          disabled={!canSwap}
          onClick={onSwap}
        />

        <IconButton
          icon={Trash2}
          label={`Retirer ${name}`}
          size="sm"
          variant="ghost"
          onClick={onRemove}
        />
      </span>
    </div>
  );
}

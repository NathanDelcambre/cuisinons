'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, PackageSearch } from 'lucide-react';
import { RETAILER_LABELS, UNIT_LABELS, type Retailer } from '@cuisinons/shared';
import { Button, EmptyState, Modal, Skeleton, cn } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';
import { IngredientIcon } from './ingredient-icon';

type ProductOption = {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  packageQuantity: number;
  packageUnit: 'G' | 'ML';
  packageCount: number;
  estimatedPrice: number;
  currency: string;
  priceObservedAt: string;
  storeName: string | null;
};

const EUR_FORMAT = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export function ProductSwapModal({
  itemId,
  ingredientName,
  currentBarcode,
  retailer,
  onClose,
}: {
  itemId: string | null;
  ingredientName: string;
  currentBarcode: string | null;
  retailer: Retailer | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const open = itemId !== null;
  const options = useQuery({
    queryKey: ['shopping-product-options', itemId],
    queryFn: () =>
      apiJson<ProductOption[]>(`/api/bff/shopping/items/${String(itemId)}/product-options`),
    enabled: open && retailer !== null,
  });
  const select = useMutation({
    mutationFn: (barcode: string) =>
      apiJson(`/api/bff/shopping/items/${String(itemId)}/product`, {
        method: 'PATCH',
        body: JSON.stringify({ barcode }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['shopping'] });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      title="Échanger le produit"
      description={
        retailer
          ? `Variantes de ${ingredientName} chez ${RETAILER_LABELS[retailer]}`
          : 'Choisis d’abord un magasin.'
      }
      onClose={onClose}
      className="h-[min(82dvh,38rem)]"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Annuler
        </Button>
      }
    >
      {options.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : options.isError ? (
        <EmptyState
          icon={PackageSearch}
          title="Variantes indisponibles"
          description={options.error instanceof Error ? options.error.message : undefined}
          className="py-10"
        />
      ) : (options.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Aucune variante trouvée"
          description="Le produit associé automatiquement reste sélectionné."
          className="py-10"
        />
      ) : (
        <ul className="space-y-2">
          {options.data?.map((option) => {
            const active = option.barcode === currentBarcode;
            return (
              <li key={option.barcode}>
                <button
                  type="button"
                  disabled={select.isPending}
                  aria-pressed={active}
                  onClick={() => (active ? onClose() : select.mutate(option.barcode))}
                  className={cn(
                    'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-3 text-left transition duration-200 ease-out-soft active:scale-[0.99] disabled:opacity-60',
                    active
                      ? 'border-sage-300 bg-sage-50 shadow-soft'
                      : 'border-white/80 bg-white/65 hover:bg-white/90',
                  )}
                >
                  <IngredientIcon src={option.imageUrl} size={32} />
                  <span className="min-w-0">
                    <span className="block line-clamp-2 text-sm font-medium text-ink-900">
                      {option.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-500">
                      {[option.brand, option.storeName].filter(Boolean).join(' · ') ||
                        'Sans marque'}
                    </span>
                    <span className="mt-1 block text-xs text-ink-600">
                      {option.packageCount > 1 ? `${String(option.packageCount)} × ` : ''}
                      {String(option.packageQuantity)} {UNIT_LABELS[option.packageUnit]}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabular text-sm font-semibold text-ink-900">
                      {EUR_FORMAT.format(option.estimatedPrice)}
                    </span>
                    {active ? <Check className="size-4 text-sage-600" aria-hidden /> : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {select.error instanceof Error ? (
        <p className="mt-3 text-sm text-tomato-600">{select.error.message}</p>
      ) : null}
    </Modal>
  );
}

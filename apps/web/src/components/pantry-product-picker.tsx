'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ArrowLeft, Check, PackageSearch } from 'lucide-react';
import { STORAGE_AREA_LABELS, UNIT_LABELS, type StorageArea } from '@cuisinons/shared';
import { Button, EmptyState, Input, Modal, SearchInput, Select, Skeleton } from '@cuisinons/ui';
import { apiJson } from '@/lib/api';

type Product = {
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  packageQuantity: number;
  packageUnit: 'G' | 'ML';
  nutriScore: string | null;
};

export function PantryProductPicker({
  open,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (input: { productBarcode: string; quantity: number; area: StorageArea }) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [area, setArea] = useState<StorageArea>('PANTRY');
  const products = useQuery({
    queryKey: ['pantry-product-search', query.trim()],
    queryFn: () =>
      apiJson<Product[]>(`/api/bff/pantry/products?q=${encodeURIComponent(query.trim())}`),
    enabled: open && selected === null && query.trim().length >= 2,
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setQuery('');
    }
  }, [open]);

  function choose(product: Product) {
    setSelected(product);
    setQuantity(String(product.packageQuantity));
  }

  const parsedQuantity = Number(quantity.replace(',', '.'));
  const valid = Number.isFinite(parsedQuantity) && parsedQuantity > 0;

  return (
    <Modal
      open={open}
      title={selected ? selected.name : 'Ajouter un produit'}
      description="Produits officiels du catalogue OpenFoodFacts"
      onClose={onClose}
      className="h-[min(86dvh,40rem)]"
      bodyClassName="flex flex-col overflow-hidden"
      footer={
        selected ? (
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Retour
            </Button>
            <Button
              icon={Check}
              loading={pending}
              disabled={!valid}
              onClick={() =>
                onConfirm({ productBarcode: selected.barcode, quantity: parsedQuantity, area })
              }
            >
              Ajouter
            </Button>
          </>
        ) : null
      }
    >
      {selected ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Changer de produit
          </button>
          <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3">
            {selected.imageUrl ? (
              <img
                src={selected.imageUrl}
                alt=""
                className="size-14 shrink-0 rounded-xl bg-white object-contain"
              />
            ) : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white">
                <PackageSearch className="size-5 text-ink-300" aria-hidden />
              </span>
            )}
            <span className="min-w-0">
              <span className="block line-clamp-2 text-sm font-medium">{selected.name}</span>
              <span className="block truncate text-xs text-ink-500">
                {selected.brand ?? 'Sans marque'} · {String(selected.packageQuantity)}{' '}
                {UNIT_LABELS[selected.packageUnit]}
              </span>
            </span>
          </div>
          <label className="block text-sm text-ink-700">
            Quantité restante
            <span className="mt-1 flex items-center gap-2">
              <Input
                value={quantity}
                inputMode="decimal"
                onChange={(event) => setQuantity(event.target.value)}
              />
              <span className="w-10 text-xs text-ink-500">{UNIT_LABELS[selected.packageUnit]}</span>
            </span>
          </label>
          <Select
            value={area}
            aria-label="Zone de rangement"
            options={Object.entries(STORAGE_AREA_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={(value) => setArea(value as StorageArea)}
          />
          {error ? <p className="text-sm text-tomato-600">{error}</p> : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un produit ou une marque"
            autoFocus
          />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {products.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-20" />
                ))}
              </div>
            ) : query.trim().length < 2 ? (
              <EmptyState icon={PackageSearch} title="Recherche un produit" className="py-12" />
            ) : (products.data?.length ?? 0) === 0 ? (
              <EmptyState icon={PackageSearch} title="Aucun produit trouvé" className="py-12" />
            ) : (
              <ul className="space-y-2">
                {products.data?.map((product) => (
                  <li key={product.barcode}>
                    <button
                      type="button"
                      onClick={() => choose(product)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/80 bg-white/65 p-3 text-left"
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="size-11 shrink-0 rounded-xl bg-white object-contain"
                        />
                      ) : (
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white">
                          <PackageSearch className="size-4 text-ink-300" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block line-clamp-2 text-sm text-ink-900">
                          {product.name}
                        </span>
                        <span className="block truncate text-xs text-ink-500">
                          {product.brand ?? 'Sans marque'} · {String(product.packageQuantity)}{' '}
                          {UNIT_LABELS[product.packageUnit]}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

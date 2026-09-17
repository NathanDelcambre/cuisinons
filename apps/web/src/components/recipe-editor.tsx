'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUANTITY_UNITS, UNIT_LABELS, type QuantityUnit } from '@cuisinons/shared';
import { apiJson } from '@/lib/api';
import { IngredientPicker } from './ingredient-picker';

type Line = {
  ingredientId: string;
  name: string;
  iconUrl: string | null;
  quantity: number;
  unit: QuantityUnit;
  gramsManual: number | null;
  displayQuantity: string;
};

type Step = { description: string; durationMinutes: number | null };

export function RecipeEditor({ existing }: { existing?: Record<string, unknown> }) {
  const router = useRouter();
  const [name, setName] = useState(String(existing?.name ?? ''));
  const [description, setDescription] = useState(String(existing?.description ?? ''));
  const [servings, setServings] = useState(Number(existing?.servings ?? 2));
  const [prep, setPrep] = useState<number | null>((existing?.prepTimeMinutes as number | null) ?? null);
  const [cook, setCook] = useState<number | null>((existing?.cookTimeMinutes as number | null) ?? null);
  const [lines, setLines] = useState<Line[]>([]);
  const [steps, setSteps] = useState<Step[]>([{ description: '', durationMinutes: null }]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const tags = useQuery({ queryKey: ['tags'], queryFn: () => apiJson<Array<{ id: string; label: string }>>('/api/bff/tags') });
  const equipment = useQuery({
    queryKey: ['equipment'],
    queryFn: () => apiJson<Array<{ id: string; label: string }>>('/api/bff/equipment'),
  });

  useEffect(() => {
    if (!existing) return;
    const ingredients = (existing.ingredients as Array<Record<string, unknown>> | undefined) ?? [];
    setLines(
      ingredients.map((line) => {
        const ingredient = line.ingredient as { id?: string; nameFr?: string; iconUrl?: string | null };
        return {
          ingredientId: String(line.ingredientId ?? ingredient.id ?? ''),
          name: String(ingredient.nameFr ?? ''),
          iconUrl: ingredient.iconUrl ?? null,
          quantity: Number(line.quantity),
          unit: line.unit as QuantityUnit,
          gramsManual: line.gramsManual ? Number(line.grams) : null,
          displayQuantity: String(line.displayQuantity ?? line.quantity ?? ''),
        };
      }),
    );
    const existingSteps = (existing.steps as Array<{ description: string; durationMinutes: number | null }>) ?? [];
    if (existingSteps.length) setSteps(existingSteps);
    setTagIds(((existing.tags as Array<{ tagId?: string; tag?: { id: string } }>) ?? []).map((t) => t.tagId ?? t.tag?.id ?? ''));
    setEquipmentIds(
      ((existing.equipment as Array<{ equipmentId?: string; equipment?: { id: string } }>) ?? []).map(
        (e) => e.equipmentId ?? e.equipment?.id ?? '',
      ),
    );
  }, [existing]);

  const payload = useMemo(
    () => ({
      name,
      description: description || null,
      servings,
      prepTimeMinutes: prep,
      cookTimeMinutes: cook,
      status: 'PUBLISHED' as const,
      version: existing?.version as number | undefined,
      ingredients: lines.map((line) => ({
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        unit: line.unit,
        gramsManual: line.gramsManual,
        displayQuantity: line.displayQuantity || null,
      })),
      steps: steps.filter((s) => s.description.trim().length > 0),
      tagIds: tagIds.filter(Boolean),
      equipmentIds: equipmentIds.filter(Boolean),
    }),
    [name, description, servings, prep, cook, lines, steps, tagIds, equipmentIds, existing],
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const path = existing?.id ? `/api/bff/recipes/${String(existing.id)}` : '/api/bff/recipes';
      const method = existing?.id ? 'PATCH' : 'POST';
      const created = await apiJson<{ id: string }>(path, { method, body: JSON.stringify(payload) });
      router.push(`/recipes/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{existing ? 'Modifier la recette' : 'Nouvelle recette'}</h1>
      <section className="glass space-y-4 rounded-[28px] p-5">
        <h2 className="font-medium">Informations générales</h2>
        <label className="block text-sm">
          Nom
          <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full rounded-2xl border px-3 py-2" />
        </label>
        <label className="block text-sm">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-2xl border px-3 py-2" />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            Portions
            <input type="number" min={1} value={servings} onChange={(e) => setServings(Number(e.target.value))} className="mt-1 w-full rounded-2xl border px-3 py-2" />
          </label>
          <label className="text-sm">
            Préparation (min)
            <input type="number" value={prep ?? ''} onChange={(e) => setPrep(e.target.value ? Number(e.target.value) : null)} className="mt-1 w-full rounded-2xl border px-3 py-2" />
          </label>
          <label className="text-sm">
            Cuisson (min)
            <input type="number" value={cook ?? ''} onChange={(e) => setCook(e.target.value ? Number(e.target.value) : null)} className="mt-1 w-full rounded-2xl border px-3 py-2" />
          </label>
        </div>
      </section>
      <section className="glass space-y-3 rounded-[28px] p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Ingrédients</h2>
          <button className="rounded-full bg-stone-900 px-3 py-1 text-sm text-white" onClick={() => setPicker(true)}>
            Ajouter
          </button>
        </div>
        {lines.map((line, index) => (
          <div key={`${line.ingredientId}-${index}`} className="grid grid-cols-[1fr_90px_110px_auto] items-center gap-2">
            <span className="flex items-center gap-2 text-sm">
              {line.iconUrl ? <img src={line.iconUrl} alt="" className="size-7" /> : null}
              {line.name}
            </span>
            <input
              value={line.displayQuantity}
              onChange={(e) =>
                setLines((all) =>
                  all.map((l, i) =>
                    i === index
                      ? { ...l, displayQuantity: e.target.value, quantity: Number(e.target.value.replace(',', '.').split('/')[0]) || l.quantity }
                      : l,
                  ),
                )
              }
              className="rounded-xl border px-2 py-1 text-sm"
            />
            <select
              value={line.unit}
              onChange={(e) =>
                setLines((all) => all.map((l, i) => (i === index ? { ...l, unit: e.target.value as QuantityUnit } : l)))
              }
              className="rounded-xl border px-2 py-1 text-sm"
            >
              {QUANTITY_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {UNIT_LABELS[unit]}
                </option>
              ))}
            </select>
            <button className="text-xs text-stone-400" onClick={() => setLines((all) => all.filter((_, i) => i !== index))}>
              Retirer
            </button>
          </div>
        ))}
      </section>
      <section className="glass rounded-[28px] p-5">
        <h2 className="mb-3 font-medium">Ustensiles</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(equipment.data ?? []).map((item) => {
            const on = equipmentIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setEquipmentIds((ids) => (on ? ids.filter((id) => id !== item.id) : [...ids, item.id]))
                }
                className={`rounded-2xl px-3 py-3 text-sm ${on ? 'bg-stone-900 text-white' : 'bg-white/70'}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>
      <section className="glass space-y-3 rounded-[28px] p-5">
        <h2 className="font-medium">Préparation</h2>
        {steps.map((step, index) => (
          <div key={index} className="flex gap-2">
            <textarea
              value={step.description}
              onChange={(e) =>
                setSteps((all) => all.map((s, i) => (i === index ? { ...s, description: e.target.value } : s)))
              }
              className="min-h-20 flex-1 rounded-2xl border px-3 py-2"
              placeholder={`Étape ${index + 1}`}
            />
            <button className="text-xs text-stone-400" onClick={() => setSteps((all) => all.filter((_, i) => i !== index))}>
              ✕
            </button>
          </div>
        ))}
        <button className="text-sm" onClick={() => setSteps((s) => [...s, { description: '', durationMinutes: null }])}>
          Ajouter une étape
        </button>
      </section>
      <section className="glass rounded-[28px] p-5">
        <h2 className="mb-3 font-medium">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {(tags.data ?? []).map((tag) => {
            const on = tagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                className={`rounded-full px-3 py-1 text-sm ${on ? 'bg-stone-900 text-white' : 'bg-white/80'}`}
                onClick={() => setTagIds((ids) => (on ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]))}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </section>
      {error ? <p className="text-sm text-[#c45c4a]">{error}</p> : null}
      <button disabled={saving || !name} className="rounded-full bg-stone-900 px-6 py-3 text-white disabled:opacity-50" onClick={() => void save()}>
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {picker ? (
        <IngredientPicker
          onClose={() => setPicker(false)}
          onPick={(ingredient) => {
            setLines((all) => [
              ...all,
              {
                ingredientId: ingredient.id,
                name: ingredient.nameFr,
                iconUrl: ingredient.iconUrl,
                quantity: 100,
                unit: 'G',
                gramsManual: null,
                displayQuantity: '100',
              },
            ]);
            setPicker(false);
          }}
        />
      ) : null}
    </div>
  );
}

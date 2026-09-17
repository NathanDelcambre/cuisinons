'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Carrot, Check, Plus, Trash2, X } from 'lucide-react';
import { QUANTITY_UNITS, UNIT_LABELS, type QuantityUnit } from '@cuisinons/shared';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  IconButton,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@cuisinons/ui';
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
  const tags = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiJson<Array<{ id: string; label: string }>>('/api/bff/tags'),
  });
  const equipment = useQuery({
    queryKey: ['equipment'],
    queryFn: () => apiJson<Array<{ id: string; label: string; slug: string }>>('/api/bff/equipment'),
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

  const saveButton = (
    <Button icon={Check} disabled={!name} loading={saving} onClick={() => void save()}>
      Enregistrer
    </Button>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={existing ? 'Recette' : 'Nouvelle'}
        title={existing ? 'Modifier la recette' : 'Nouvelle recette'}
        actions={saveButton}
      />

      <Card className="space-y-4">
        <h2 className="font-display text-base font-semibold tracking-[-0.01em] text-ink-900">
          Informations générales
        </h2>
        <Field label="Nom">
          {({ id }) => (
            <Input id={id} value={name} onChange={(e) => setName(e.target.value)} required placeholder="Gratin de courgettes" />
          )}
        </Field>
        <Field label="Description" hint="Optionnelle : le contexte, l’origine, une astuce.">
          {({ id, describedBy }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Portions">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Préparation" hint="minutes">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="number"
                min={0}
                value={prep ?? ''}
                onChange={(e) => setPrep(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          </Field>
          <Field label="Cuisson" hint="minutes">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="number"
                min={0}
                value={cook ?? ''}
                onChange={(e) => setCook(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          </Field>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Ingrédients</h2>
          <Button variant="glass" size="sm" icon={Plus} onClick={() => setPicker(true)}>
            Ajouter
          </Button>
        </div>
        {lines.length === 0 ? (
          <EmptyState
            icon={Carrot}
            title="Aucun ingrédient"
            description="Les valeurs nutritionnelles se calculent à partir de cette liste."
            action={
              <Button variant="glass" size="sm" icon={Plus} onClick={() => setPicker(true)}>
                Ajouter un ingrédient
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {lines.map((line, index) => (
              <li
                key={`${line.ingredientId}-${index}`}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-white/70 bg-white/70 p-2.5 sm:grid-cols-[1fr_5.5rem_8rem_auto]"
              >
                <span className="flex min-w-0 items-center gap-2.5 text-sm text-ink-900">
                  {line.iconUrl ? (
                    <img src={line.iconUrl} alt="" width={28} height={28} className="size-7 shrink-0" />
                  ) : null}
                  <span className="truncate">{line.name}</span>
                </span>
                <Input
                  value={line.displayQuantity}
                  aria-label={`Quantité de ${line.name}`}
                  className="h-10 px-3 text-sm"
                  onChange={(e) =>
                    setLines((all) =>
                      all.map((l, i) =>
                        i === index
                          ? {
                              ...l,
                              displayQuantity: e.target.value,
                              quantity: Number(e.target.value.replace(',', '.').split('/')[0]) || l.quantity,
                            }
                          : l,
                      ),
                    )
                  }
                />
                <Select
                  value={line.unit}
                  aria-label={`Unité de ${line.name}`}
                  className="h-10 text-sm"
                  onChange={(e) =>
                    setLines((all) =>
                      all.map((l, i) => (i === index ? { ...l, unit: e.target.value as QuantityUnit } : l)),
                    )
                  }
                >
                  {QUANTITY_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {UNIT_LABELS[unit]}
                    </option>
                  ))}
                </Select>
                <IconButton
                  icon={Trash2}
                  label={`Retirer ${line.name}`}
                  size="sm"
                  variant="ghost"
                  className="text-ink-400 hover:text-tomato-500"
                  onClick={() => setLines((all) => all.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Ustensiles</h2>
        <div className="flex flex-wrap gap-2">
          {(equipment.data ?? []).map((item) => (
            <Chip
              key={item.id}
              selected={equipmentIds.includes(item.id)}
              onClick={() =>
                setEquipmentIds((ids) =>
                  ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id],
                )
              }
            >
              <img
                src={`/equipment/${item.slug}.png`}
                alt=""
                width={20}
                height={20}
                className="size-5"
                decoding="async"
              />
              {item.label}
            </Chip>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Préparation</h2>
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="tabular mt-2.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700"
            >
              {index + 1}
            </span>
            <Textarea
              value={step.description}
              aria-label={`Étape ${String(index + 1)}`}
              placeholder={`Étape ${String(index + 1)}`}
              onChange={(e) =>
                setSteps((all) => all.map((s, i) => (i === index ? { ...s, description: e.target.value } : s)))
              }
            />
            <IconButton
              icon={X}
              label={`Supprimer l’étape ${String(index + 1)}`}
              size="sm"
              variant="ghost"
              className="mt-2 text-ink-400 hover:text-tomato-500"
              onClick={() => setSteps((all) => all.filter((_, i) => i !== index))}
            />
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          icon={Plus}
          onClick={() => setSteps((s) => [...s, { description: '', durationMinutes: null }])}
        >
          Ajouter une étape
        </Button>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Tags</h2>
        <div className="flex flex-wrap gap-2">
          {(tags.data ?? []).map((tag) => (
            <Chip
              key={tag.id}
              selected={tagIds.includes(tag.id)}
              onClick={() =>
                setTagIds((ids) => (ids.includes(tag.id) ? ids.filter((id) => id !== tag.id) : [...ids, tag.id]))
              }
            >
              {tag.label}
            </Chip>
          ))}
        </div>
      </Card>

      {error ? (
        <p role="alert" className="text-sm font-medium text-tomato-500">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">{saveButton}</div>

      <IngredientPicker
        open={picker}
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
    </div>
  );
}

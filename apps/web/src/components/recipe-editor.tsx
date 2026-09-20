'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Carrot, Check, Flame, Plus, Search, Timer, Trash2, Users, X } from 'lucide-react';
import { QUANTITY_UNITS, UNIT_LABELS, kitchenLabel, type QuantityUnit } from '@cuisinons/shared';
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
import { routes } from '@/lib/routes';
import { IngredientPicker } from './ingredient-picker';
import { IngredientIcon } from './ingredient-icon';
import { RecipePhotoField } from './recipe-photo-field';
import { StepDescriptionField } from './step-mentions';

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
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    typeof existing?.photoUrl === 'string' ? existing.photoUrl : null,
  );
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null | undefined>(undefined);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);
  const [equipmentQuery, setEquipmentQuery] = useState('');
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
          name: kitchenLabel(String(ingredient.nameFr ?? '')),
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

  const distinctIngredients = new Set(lines.map((line) => line.ingredientId).filter(Boolean)).size;
  const canSave = Boolean(name.trim()) && distinctIngredients >= 2;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const path = existing?.id ? `/api/bff/recipes/${String(existing.id)}` : '/api/bff/recipes';
      const method = existing?.id ? 'PATCH' : 'POST';
      const created = await apiJson<{ id: string }>(path, {
        method,
        body: JSON.stringify(
          photoDataUrl === undefined ? payload : { ...payload, photoDataUrl },
        ),
      });
      router.push(`${routes.recettes}?recette=${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  const saveButton = (
    <Button icon={Check} disabled={!canSave} loading={saving} onClick={() => void save()}>
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
        <RecipePhotoField
          preview={photoPreview}
          onChange={(next) => {
            setPhotoPreview(next);
            setPhotoDataUrl(next);
          }}
        />
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
        <div className="grid grid-cols-3 gap-3">
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5 text-ink-400" aria-hidden />
                Portions
              </span>
            }
          >
            {({ id }) => (
              <div className="relative">
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={servings}
                  className="h-11 min-h-11 pr-14"
                  onChange={(e) => setServings(Number(e.target.value))}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-ink-400">
                  pers.
                </span>
              </div>
            )}
          </Field>
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                <Timer className="size-3.5 text-ink-400" aria-hidden />
                Prépa
              </span>
            }
          >
            {({ id }) => (
              <div className="relative">
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={prep ?? ''}
                  className="h-11 min-h-11 pr-10"
                  onChange={(e) => setPrep(e.target.value ? Number(e.target.value) : null)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-ink-400">
                  min
                </span>
              </div>
            )}
          </Field>
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                <Flame className="size-3.5 text-ink-400" aria-hidden />
                Cuisson
              </span>
            }
          >
            {({ id }) => (
              <div className="relative">
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={cook ?? ''}
                  className="h-11 min-h-11 pr-10"
                  onChange={(e) => setCook(e.target.value ? Number(e.target.value) : null)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-ink-400">
                  min
                </span>
              </div>
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
                className="min-w-0 rounded-xl border border-white/70 bg-white/70 p-2.5 sm:grid sm:grid-cols-[1fr_5.5rem_8rem_auto] sm:items-center sm:gap-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <IngredientIcon src={line.iconUrl} name={line.name} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-900">{line.name}</span>
                  <IconButton
                    icon={Trash2}
                    label={`Retirer ${line.name}`}
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-ink-400 hover:text-tomato-500 sm:hidden"
                    onClick={() => setLines((all) => all.filter((_, i) => i !== index))}
                  />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-0 sm:contents">
                <Input
                  value={line.displayQuantity}
                  aria-label={`Quantité de ${line.name}`}
                  className="h-11 min-w-0 px-3 text-sm"
                  inputMode="decimal"
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
                  className="h-11 min-h-11 min-w-0 text-sm"
                  options={QUANTITY_UNITS.map((unit) => ({
                    value: unit,
                    label: UNIT_LABELS[unit],
                  }))}
                  onChange={(next) =>
                    setLines((all) => all.map((l, i) => (i === index ? { ...l, unit: next } : l)))
                  }
                />
                </div>
                <IconButton
                  icon={Trash2}
                  label={`Retirer ${line.name}`}
                  size="sm"
                  variant="ghost"
                  className="hidden text-ink-400 hover:text-tomato-500 sm:inline-flex"
                  onClick={() => setLines((all) => all.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>
        )}
        {distinctIngredients < 2 ? (
          <p role="alert" className="text-sm font-medium text-tomato-500">
            Ajoute au moins deux ingrédients distincts.
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-base font-semibold tracking-[-0.01em] text-ink-900">Ustensiles</h2>
        <div className="mb-3">
          <Input
            icon={Search}
            value={equipmentQuery}
            onChange={(e) => setEquipmentQuery(e.target.value)}
            placeholder="Filtrer les ustensiles"
            aria-label="Filtrer les ustensiles"
            className="h-11"
          />
        </div>
        <EquipmentChips
          items={equipment.data ?? []}
          selectedIds={equipmentIds}
          query={equipmentQuery}
          expanded={equipmentOpen}
          onToggleExpand={() => setEquipmentOpen((v) => !v)}
          onToggle={(id) =>
            setEquipmentIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
          }
        />
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
            <StepDescriptionField
              value={step.description}
              label={`Étape ${String(index + 1)}`}
              placeholder={`Étape ${String(index + 1)} — tape / pour un ingrédient`}
              ingredients={lines.map((line) => ({ id: line.ingredientId, name: line.name }))}
              onChange={(next) =>
                setSteps((all) => all.map((s, i) => (i === index ? { ...s, description: next } : s)))
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
              name: kitchenLabel(ingredient.nameFr),
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

const COMMON_EQUIPMENT = [
  'poele',
  'casserole',
  'four',
  'couteau',
  'saladier',
  'planche',
  'fouet',
  'spatule',
  'passoire',
  'air-fryer',
];

function EquipmentChips({
  items,
  selectedIds,
  query,
  expanded,
  onToggleExpand,
  onToggle,
}: {
  items: Array<{ id: string; label: string; slug: string }>;
  selectedIds: string[];
  query: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle: (id: string) => void;
}) {
  const needle = query.trim().toLowerCase();
  const filtered = items.filter((item) => {
    if (!needle) return true;
    return item.label.toLowerCase().includes(needle) || item.slug.includes(needle);
  });
  const selected = filtered.filter((item) => selectedIds.includes(item.id));
  const common = filtered.filter(
    (item) => !selectedIds.includes(item.id) && COMMON_EQUIPMENT.includes(item.slug),
  );
  const rest = filtered.filter(
    (item) => !selectedIds.includes(item.id) && !COMMON_EQUIPMENT.includes(item.slug),
  );
  const visible = needle || expanded ? [...selected, ...common, ...rest] : [...selected, ...common];
  const hiddenCount = rest.length;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {visible.map((item) => (
          <Chip key={item.id} selected={selectedIds.includes(item.id)} onClick={() => onToggle(item.id)}>
            <img
              src={`/equipment/${item.slug}.png`}
              alt=""
              width={24}
              height={24}
              className="size-6"
              decoding="async"
            />
            {item.label}
          </Chip>
        ))}
      </div>
      {!needle && hiddenCount > 0 ? (
        <button
          type="button"
          className="mt-3 text-sm font-medium text-sage-700 underline-offset-2 hover:underline"
          aria-expanded={expanded}
          onClick={onToggleExpand}
        >
          {expanded ? 'Voir moins' : 'Voir plus'}
        </button>
      ) : null}
    </div>
  );
}

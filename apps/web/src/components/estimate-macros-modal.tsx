'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import {
  BODY_HEIGHT_CM,
  BODY_WEIGHT_KG,
  estimateDailyMacros,
  type EstimatedMacros,
} from '@cuisinons/shared';
import { Button, Field, Input, Modal, Switch } from '@cuisinons/ui';
import { MacroIcon, type MacroKey } from '@/components/macro-icon';

export type BodyProfile = {
  heightCm: number | null;
  weightKg: number | null;
  targetWeightKg: number | null;
};

const PREVIEW: Array<{ key: MacroKey; label: string; unit: string; wrap: string }> = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', wrap: 'bg-peach-200/80' },
  { key: 'protein', label: 'Protéines', unit: 'g', wrap: 'bg-sage-100' },
  { key: 'carbs', label: 'Glucides', unit: 'g', wrap: 'bg-ink-100' },
  { key: 'fat', label: 'Lipides', unit: 'g', wrap: 'bg-tomato-100' },
];

function asField(value: number | null): string {
  return value == null ? '' : String(value);
}

export function EstimateMacrosModal({
  open,
  profile,
  pending = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  profile?: BodyProfile | null;
  pending?: boolean;
  onClose: () => void;
  onConfirm: (input: { heightCm: number; weightKg: number; targetWeightKg: number | null }) => void;
}) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [stable, setStable] = useState(true);
  const [target, setTarget] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWeight(asField(profile?.weightKg ?? null));
    setHeight(asField(profile?.heightCm ?? null));
    const stayStable = profile?.targetWeightKg == null;
    setStable(stayStable);
    setTarget(asField(profile?.targetWeightKg ?? profile?.weightKg ?? null));
    setConfirming(false);
  }, [open, profile]);

  const parsedWeight = Number(weight.replace(',', '.'));
  const parsedHeight = Number(height.replace(',', '.'));
  const parsedTarget = Number(target.replace(',', '.'));
  const targetWeightKg = stable ? null : parsedTarget;

  const estimate = useMemo(
    () =>
      estimateDailyMacros({
        weightKg: parsedWeight,
        heightCm: parsedHeight,
        targetWeightKg: Number.isFinite(parsedTarget) || stable ? targetWeightKg : null,
      }),
    [parsedHeight, parsedTarget, parsedWeight, stable, targetWeightKg],
  );

  return (
    <Modal
      open={open}
      title="Estimer mes macros"
      description="À partir de ta taille et de ton poids. Ce n’est qu’un ordre de grandeur."
      onClose={onClose}
      footer={
        confirming ? (
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Retour
            </Button>
            <Button
              icon={Check}
              loading={pending}
              disabled={!estimate}
              onClick={() => {
                if (!estimate) return;
                onConfirm({
                  heightCm: parsedHeight,
                  weightKg: parsedWeight,
                  targetWeightKg,
                });
              }}
            >
              Confirmer
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button icon={Sparkles} disabled={!estimate} onClick={() => setConfirming(true)}>
              Remplir mes objectifs
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Poids actuel" hint="En kg.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="number"
                inputMode="decimal"
                min={BODY_WEIGHT_KG.min}
                max={BODY_WEIGHT_KG.max}
                step="0.1"
                placeholder="kg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            )}
          </Field>
          <Field label="Taille" hint="En cm.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="number"
                inputMode="decimal"
                min={BODY_HEIGHT_CM.min}
                max={BODY_HEIGHT_CM.max}
                step="0.5"
                placeholder="cm"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            )}
          </Field>
        </div>

        <Switch
          checked={stable}
          onChange={(next) => {
            setStable(next);
            if (!next && !target && weight) setTarget(weight);
          }}
          label="Rester stable"
          description="Maintenir le poids actuel, sans déficit ni surplus."
        />

        {stable ? null : (
          <Field label="Poids visé" hint="En kg.">
            {({ id, describedBy }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                type="number"
                inputMode="decimal"
                min={BODY_WEIGHT_KG.min}
                max={BODY_WEIGHT_KG.max}
                step="0.1"
                placeholder="kg"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            )}
          </Field>
        )}

        <EstimatePreview estimate={estimate} confirming={confirming} />
      </div>
    </Modal>
  );
}

function EstimatePreview({
  estimate,
  confirming,
}: {
  estimate: EstimatedMacros | null;
  confirming: boolean;
}) {
  if (!estimate) {
    return (
      <p className="rounded-2xl bg-ink-900/5 px-4 py-3 text-sm text-ink-500">
        Renseigne un poids et une taille pour voir une proposition.
      </p>
    );
  }

  return (
    <div className="rounded-2xl bg-ink-900/5 px-4 py-3">
      <p className="text-sm font-medium text-ink-800">
        {confirming
          ? 'Ces valeurs remplaceront tes objectifs actuels.'
          : estimate.stable
            ? 'Proposition pour rester stable'
            : 'Proposition selon ton poids visé'}
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PREVIEW.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span className={`flex size-7 items-center justify-center rounded-lg ${item.wrap}`}>
              <MacroIcon kind={item.key} className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] text-ink-500">{item.label}</span>
              <span className="tabular text-sm font-semibold text-ink-900">
                {estimate[item.key]} {item.unit}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

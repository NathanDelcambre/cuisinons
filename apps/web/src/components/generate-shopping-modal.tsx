'use client';

import { useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { RETAILERS, RETAILER_LABELS, type Retailer } from '@cuisinons/shared';
import {
  Button,
  IconButton,
  Inset,
  Modal,
  Segmented,
  Select,
  Stepper,
  Switch,
  cn,
} from '@cuisinons/ui';

type GeneratePeriod =
  | { mode: 'week'; from: string }
  | { mode: 'days'; dates: string[] }
  | { mode: 'next'; days: number; from: string };

export type GenerateShoppingInput = GeneratePeriod & {
  retailer: Retailer;
  economical: boolean;
};

type Mode = GenerateShoppingInput['mode'];

const iso = (date: Date) => format(date, 'yyyy-MM-dd');

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'week', label: 'Semaine' },
  { value: 'days', label: 'Jours' },
  { value: 'next', label: 'À venir' },
];

const RETAILER_OPTIONS = RETAILERS.map((value) => ({
  value,
  label: RETAILER_LABELS[value],
}));

function rangeLabel(from: Date, to: Date) {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonth) {
    return `${format(from, 'd', { locale: fr })} – ${format(to, 'd MMM', { locale: fr })}`;
  }
  return `${format(from, 'd MMM', { locale: fr })} – ${format(to, 'd MMM', { locale: fr })}`;
}

function WeekNav({ weekStart, onChange }: { weekStart: Date; onChange: (next: Date) => void }) {
  const weekEnd = addDays(weekStart, 6);
  return (
    <div className="flex items-center justify-center gap-2">
      <IconButton
        icon={ChevronLeft}
        label="Semaine précédente"
        size="sm"
        variant="ghost"
        onClick={() => onChange(addDays(weekStart, -7))}
      />
      <p className="min-w-[9.5rem] text-center text-sm font-medium text-ink-900">
        {rangeLabel(weekStart, weekEnd)}
      </p>
      <IconButton
        icon={ChevronRight}
        label="Semaine suivante"
        size="sm"
        variant="ghost"
        onClick={() => onChange(addDays(weekStart, 7))}
      />
    </div>
  );
}

function DayStrip({
  weekStart,
  selected,
  onToggle,
}: {
  weekStart: Date;
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const today = iso(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((day) => {
        const value = iso(day);
        const on = selected.includes(value);
        const isToday = value === today;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            aria-label={format(day, 'EEEE d MMMM', { locale: fr })}
            onClick={() => onToggle(value)}
            className={cn(
              'flex flex-col items-center rounded-2xl py-2.5 transition duration-200 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 active:scale-[0.97]',
              on ? 'bg-sage-500 text-white shadow-soft' : 'bg-white/80 text-ink-800 hover:bg-white',
              isToday && !on && 'ring-1 ring-inset ring-sage-400',
            )}
          >
            <span
              className={cn(
                'text-[11px] font-medium uppercase',
                on ? 'text-white/80' : 'text-ink-500',
              )}
            >
              {format(day, 'EEEEEE', { locale: fr })}
            </span>
            <span className="tabular text-[15px] font-semibold leading-5">{format(day, 'd')}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Periode de generation : semaine, jours coches, ou N jours a partir d'aujourd'hui.
 * Le contenu tient dans une feuille courte, pour que la liste reste l'ecran principal.
 */
export function GenerateShoppingModal({
  open,
  pending = false,
  error = null,
  onClose,
  onGenerate,
}: {
  open: boolean;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
  onGenerate: (input: GenerateShoppingInput) => void;
}) {
  const [mode, setMode] = useState<Mode>('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [days, setDays] = useState<string[]>([]);
  const [nextDays, setNextDays] = useState(3);
  const [retailer, setRetailer] = useState<Retailer>('LECLERC');
  const [economical, setEconomical] = useState(true);

  const today = new Date();
  const nextUntil = addDays(today, nextDays - 1);
  const canGenerate = mode !== 'days' || days.length > 0;

  const help =
    mode === 'week'
      ? 'Tous les repas, du lundi au dimanche.'
      : mode === 'days'
        ? 'Coche seulement les jours à couvrir.'
        : 'À partir d’aujourd’hui.';

  return (
    <Modal
      open={open}
      title="Générer mes courses"
      description="Seulement ce qu’il te manque pour les repas prévus."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="accent"
            icon={Sparkles}
            loading={pending}
            disabled={!canGenerate}
            onClick={() => {
              if (mode === 'week') onGenerate({ mode, from: iso(weekStart), retailer, economical });
              else if (mode === 'days') onGenerate({ mode, dates: days, retailer, economical });
              else onGenerate({ mode, days: nextDays, from: iso(today), retailer, economical });
            }}
          >
            Générer la liste
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-900">Magasin</p>
          <Select
            value={retailer}
            options={RETAILER_OPTIONS}
            aria-label="Enseigne pour les courses"
            onChange={setRetailer}
          />
          <p className="text-xs text-ink-500">
            Les produits et prix observés proviennent d’Open Food Facts et Open Prices.
          </p>
        </div>

        <Inset className="p-3.5">
          <Switch
            checked={economical}
            onChange={setEconomical}
            label="Formats économiques"
            description="Autorise un format plus grand, jusqu’à 10× le besoin, quand le prix au kilo ou au litre est meilleur."
          />
        </Inset>

        <Segmented
          label="Période"
          value={mode}
          onChange={(next) => {
            setMode(next);
            if (next === 'days' && days.length === 0) setDays([iso(new Date())]);
          }}
          options={MODES}
          className="flex w-full [&>button]:min-w-0 [&>button]:flex-1"
        />

        <div className="space-y-2">
          <p className="text-sm text-ink-500">{help}</p>
          <Inset className="space-y-3 p-3.5">
            {mode === 'week' ? <WeekNav weekStart={weekStart} onChange={setWeekStart} /> : null}

            {mode === 'days' ? (
              <>
                <WeekNav weekStart={weekStart} onChange={setWeekStart} />
                <DayStrip
                  weekStart={weekStart}
                  selected={days}
                  onToggle={(value) =>
                    setDays((current) =>
                      current.includes(value)
                        ? current.filter((d) => d !== value)
                        : [...current, value],
                    )
                  }
                />
              </>
            ) : null}

            {mode === 'next' ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <Stepper
                  value={nextDays}
                  onChange={setNextDays}
                  step={1}
                  min={1}
                  max={14}
                  suffix={nextDays > 1 ? 'jours' : 'jour'}
                  labelDecrease="Moins de jours"
                  labelIncrease="Plus de jours"
                />
                <p className="text-sm text-ink-500">{rangeLabel(today, nextUntil)}</p>
              </div>
            ) : null}
          </Inset>
        </div>

        {error ? <p className="text-sm text-tomato-600">{error}</p> : null}
      </div>
    </Modal>
  );
}

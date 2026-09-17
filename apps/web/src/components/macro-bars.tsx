'use client';

type Goal = {
  caloriesMode: string;
  caloriesValue: string | null;
  proteinMode: string;
  proteinValue: string | null;
  carbsMode: string;
  carbsValue: string | null;
  fatMode: string;
  fatValue: string | null;
};

function bar(label: string, actual: number, target: number | null, unit: string) {
  const max = target && target > 0 ? target : Math.max(actual, 1);
  const pct = Math.min(100, (actual / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-stone-500">
        <span>{label}</span>
        <span>
          {Math.round(actual)} {target ? `/ ${Math.round(target)}` : ''} {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-200/80">
        <div className="h-full rounded-full bg-[#7d9b8a]" style={{ width: `${String(pct)}%` }} />
      </div>
    </div>
  );
}

export function MacroBars({
  actual,
  goals,
}: {
  actual: { kcal: number; protein: number; carbs: number; fat: number };
  goals: Goal;
}) {
  return (
    <div className="glass grid gap-3 rounded-[28px] p-5 sm:grid-cols-2 lg:grid-cols-4">
      {bar('Calories', actual.kcal, goals.caloriesValue ? Number(goals.caloriesValue) : null, 'kcal')}
      {bar('Protéines', actual.protein, goals.proteinValue ? Number(goals.proteinValue) : null, 'g')}
      {bar('Glucides', actual.carbs, goals.carbsValue ? Number(goals.carbsValue) : null, 'g')}
      {bar('Lipides', actual.fat, goals.fatValue ? Number(goals.fatValue) : null, 'g')}
    </div>
  );
}

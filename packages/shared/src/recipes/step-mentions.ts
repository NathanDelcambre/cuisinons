const TOKEN = /\[\[ing:([^\]]+)\]\]/g;

export type StepSegment =
  | { type: 'text'; value: string }
  | { type: 'ingredient'; id: string };

export type MentionIngredient = {
  id: string;
  name: string;
  quantity: number;
  unitLabel: string;
};

export function parseStepMentions(description: string): StepSegment[] {
  const segments: StepSegment[] = [];
  let last = 0;
  const re = new RegExp(TOKEN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(description)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: description.slice(last, match.index) });
    }
    const id = match[1]?.trim() ?? '';
    if (id) segments.push({ type: 'ingredient', id });
    last = match.index + match[0].length;
  }
  if (last < description.length) {
    segments.push({ type: 'text', value: description.slice(last) });
  }
  return segments;
}

export function insertIngredientToken(
  text: string,
  cursor: number,
  ingredientId: string,
): { text: string; cursor: number } {
  const token = `[[ing:${ingredientId}]]`;
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  let start = safeCursor;
  if (start > 0 && text[start - 1] === '/') start -= 1;
  const next = `${text.slice(0, start)}${token}${text.slice(safeCursor)}`;
  return { text: next, cursor: start + token.length };
}

export function scaleMentionQuantity(quantity: number, factor: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(factor)) return 0;
  return Math.round(quantity * factor * 100) / 100;
}

export function mentionTooltip(
  ingredient: MentionIngredient,
  factor: number,
): string {
  const qty = scaleMentionQuantity(ingredient.quantity, factor);
  const amount = qty.toLocaleString('fr-FR');
  return `${ingredient.name} · ${amount} ${ingredient.unitLabel}`;
}

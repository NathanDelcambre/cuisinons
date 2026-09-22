'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ingredientInStep, insertIngredientToken, parseStepMentions } from '@cuisinons/shared';
import { cn } from '@cuisinons/ui';

export type StepIngredientOption = {
  id: string;
  name: string;
};

const CHIP =
  'mx-0.5 inline-flex align-baseline rounded-md bg-sage-100 px-1.5 py-0.5 text-sage-700';

function tokenFor(id: string) {
  return `[[ing:${id}]]`;
}

function nameOf(id: string, ingredients: StepIngredientOption[]) {
  return ingredients.find((item) => item.id === id)?.name ?? 'Ingrédient';
}

function labeledParts(value: string, ingredients: StepIngredientOption[]) {
  let preceding = '';
  return parseStepMentions(value).map((part) => {
    if (part.type === 'text') {
      preceding += part.value;
      return part;
    }
    const name = ingredientInStep(nameOf(part.id, ingredients), preceding);
    return { type: 'ingredient' as const, id: part.id, name };
  });
}

function createChip(id: string, name: string) {
  const span = document.createElement('span');
  span.dataset.ingredientId = id;
  span.contentEditable = 'false';
  span.className = CHIP;
  span.textContent = name;
  return span;
}

function serializeEditor(root: HTMLElement): string {
  let out = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.dataset.ingredientId) {
      out += tokenFor(node.dataset.ingredientId);
      return;
    }
    if (node.tagName === 'BR') {
      out += '\n';
      return;
    }
    if ((node.tagName === 'DIV' || node.tagName === 'P') && out.length > 0 && !out.endsWith('\n')) {
      out += '\n';
    }
    for (const child of Array.from(node.childNodes)) walk(child);
  };
  for (const child of Array.from(root.childNodes)) walk(child);
  return out.replace(/^\n/, '');
}

function nodeSerializedLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0;
  if (!(node instanceof HTMLElement)) return 0;
  if (node.dataset.ingredientId) return tokenFor(node.dataset.ingredientId).length;
  if (node.tagName === 'BR') return 1;
  let total = 0;
  for (const child of Array.from(node.childNodes)) total += nodeSerializedLength(child);
  return total;
}

function offsetAt(root: HTMLElement, container: Node, offset: number): number {
  if (container === root) {
    let total = 0;
    for (let i = 0; i < offset && i < root.childNodes.length; i += 1) {
      const child = root.childNodes[i];
      if (child) total += nodeSerializedLength(child);
    }
    return total;
  }
  let total = 0;
  const visit = (node: Node): boolean => {
    if (node === container) {
      if (node.nodeType === Node.TEXT_NODE) {
        total += offset;
        return true;
      }
      for (let i = 0; i < offset; i += 1) {
        const child = node.childNodes[i];
        if (child) total += nodeSerializedLength(child);
      }
      return true;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      total += node.textContent?.length ?? 0;
      return false;
    }
    if (node instanceof HTMLElement && node.dataset.ingredientId) {
      total += tokenFor(node.dataset.ingredientId).length;
      return false;
    }
    if (node instanceof HTMLElement && node.tagName === 'BR') {
      total += 1;
      return false;
    }
    for (const child of Array.from(node.childNodes)) {
      if (visit(child)) return true;
    }
    return false;
  };
  visit(root);
  return total;
}

function selectionOffsets(root: HTMLElement): { start: number; end: number } {
  const sel = window.getSelection();
  const fallback = serializeEditor(root).length;
  if (!sel || sel.rangeCount === 0 || !sel.anchorNode || !root.contains(sel.anchorNode)) {
    return { start: fallback, end: fallback };
  }
  const range = sel.getRangeAt(0);
  const a = offsetAt(root, range.startContainer, range.startOffset);
  const b = offsetAt(root, range.endContainer, range.endOffset);
  return { start: Math.min(a, b), end: Math.max(a, b) };
}

function setCaretOffset(root: HTMLElement, target: number) {
  const sel = window.getSelection();
  if (!sel) return;
  let remaining = Math.max(0, target);
  const place = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  };
  const visit = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.textContent?.length ?? 0;
      if (remaining <= len) {
        place(node, remaining);
        return true;
      }
      remaining -= len;
      return false;
    }
    if (node instanceof HTMLElement && node.dataset.ingredientId) {
      const len = tokenFor(node.dataset.ingredientId).length;
      if (remaining <= len) {
        const range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      remaining -= len;
      return false;
    }
    if (node instanceof HTMLElement && node.tagName === 'BR') {
      if (remaining <= 1) {
        const range = document.createRange();
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      remaining -= 1;
      return false;
    }
    for (const child of Array.from(node.childNodes)) {
      if (visit(child)) return true;
    }
    return false;
  };
  if (!visit(root)) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function paintEditor(root: HTMLElement, value: string, ingredients: StepIngredientOption[]) {
  root.replaceChildren();
  const parts = labeledParts(value, ingredients);
  if (parts.length === 0) return;
  for (const part of parts) {
    if (part.type === 'text') {
      root.append(part.value);
    } else {
      root.append(createChip(part.id, part.name));
    }
  }
}

export function StepDescriptionField({
  value,
  onChange,
  ingredients,
  label,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  ingredients: StepIngredientOption[];
  label: string;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const ingredientKey = ingredients.map((item) => `${item.id}:${item.name}`).join('|');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ingredients.filter((item) => !needle || item.name.toLowerCase().includes(needle));
  }, [ingredients, query]);

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (serializeEditor(el) === value) {
      let preceding = '';
      for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
          preceding += node.textContent ?? '';
          continue;
        }
        if (!(node instanceof HTMLElement) || !node.dataset.ingredientId) continue;
        const nextName = ingredientInStep(nameOf(node.dataset.ingredientId, ingredients), preceding);
        if (node.textContent !== nextName) node.textContent = nextName;
        preceding += nextName;
      }
      el.dataset.empty = value.length === 0 ? 'true' : 'false';
      return;
    }
    const restore = document.activeElement === el;
    const caret = restore ? selectionOffsets(el).start : null;
    paintEditor(el, value, ingredients);
    el.dataset.empty = value.length === 0 ? 'true' : 'false';
    if (restore && caret !== null) setCaretOffset(el, caret);
  }, [value, ingredientKey, ingredients]);

  useLayoutEffect(() => {
    if (open) setHighlight(0);
  }, [open, query]);

  function emitFromEditor() {
    const el = editorRef.current;
    if (!el) return '';
    const next = serializeEditor(el);
    el.dataset.empty = next.length === 0 ? 'true' : 'false';
    onChange(next);
    return next;
  }

  function pick(id: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const cursor = selectionOffsets(el).end;
    const next = insertIngredientToken(serializeEditor(el), cursor, id);
    onChange(next.text);
    paintEditor(el, next.text, ingredients);
    el.dataset.empty = next.text.length === 0 ? 'true' : 'false';
    setOpen(false);
    setQuery('');
    requestAnimationFrame(() => {
      el.focus();
      setCaretOffset(el, next.cursor);
    });
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        data-empty={value.length === 0 ? 'true' : 'false'}
        className={cn(
          'min-h-24 w-full whitespace-pre-wrap rounded-xl border border-ink-200 bg-ink-100 px-4 py-3 text-base text-ink-900 transition duration-200 ease-out-soft',
          'hover:border-ink-300 hover:bg-white focus:border-sage-300 focus:bg-white focus:outline-none',
          'data-[empty=true]:before:pointer-events-none data-[empty=true]:before:text-ink-400 data-[empty=true]:before:content-[attr(data-placeholder)]',
        )}
        onInput={() => {
          const el = editorRef.current;
          if (!el) return;
          const next = emitFromEditor();
          const caret = selectionOffsets(el).start;
          const typedSlash = next[caret - 1] === '/' && ingredients.length > 0;
          if (typedSlash) {
            setOpen(true);
            setQuery('');
          } else if (open && !next.includes('/')) {
            setOpen(false);
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          const el = editorRef.current;
          if (!el) return;
          const pasted = event.clipboardData.getData('text/plain');
          const { start, end } = selectionOffsets(el);
          const current = serializeEditor(el);
          const next = `${current.slice(0, start)}${pasted}${current.slice(end)}`;
          onChange(next);
          paintEditor(el, next, ingredients);
          el.dataset.empty = next.length === 0 ? 'true' : 'false';
          setCaretOffset(el, start + pasted.length);
        }}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(filtered.length - 1, h + 1));
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(0, h - 1));
              return;
            }
            if (e.key === 'Enter') {
              const target = filtered[highlight];
              if (target) {
                e.preventDefault();
                pick(target.id);
              }
            }
          }
        }}
      />
      {open && ingredients.length > 0 ? (
        <div
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-white/80 bg-white/95 p-1 shadow-soft"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer"
            aria-label="Filtrer les ingrédients de la recette"
            className="mb-1 h-9 w-full rounded-lg bg-ink-900/5 px-3 text-sm"
          />
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-ink-500">Aucun ingrédient.</p>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === highlight}
                className={cn(
                  'flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm',
                  index === highlight ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-white',
                )}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => pick(item.id)}
              >
                {item.name}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function StepMentionPreview({
  description,
  ingredients,
  factor,
}: {
  description: string;
  ingredients: Array<{ id: string; name: string; quantity: number; unitLabel: string }>;
  factor: number;
}) {
  const byId = new Map(ingredients.map((item) => [item.id, item]));
  return (
    <p className="text-sm leading-relaxed text-ink-800">
      {labeledParts(description, ingredients).map((part, index) => {
        if (part.type === 'text') return <span key={index}>{part.value}</span>;
        const item = byId.get(part.id);
        if (!item) return <span key={index}>Ingrédient</span>;
        const qty = (item.quantity * factor).toLocaleString('fr-FR');
        const tip = `${item.name} · ${qty} ${item.unitLabel}`;
        return (
          <button
            key={index}
            type="button"
            title={tip}
            className="mx-0.5 inline whitespace-normal break-normal rounded-md bg-sage-100 px-1.5 py-0.5 text-sage-700 underline-offset-2 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] hover:bg-sage-200"
          >
            {part.name}
          </button>
        );
      })}
    </p>
  );
}

'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Badge, type BadgeTone } from './badge';
import { cn } from './cn';

const GAP = 6;

/**
 * Rangée de pastilles sur une seule ligne. Ce qui ne rentre pas devient +N,
 * plutôt que de casser un libellé (« Plat principal ») en deux.
 */
export function OverflowBadges({
  items,
  className,
  tone = 'sage',
}: {
  items: ReadonlyArray<{ key: string; label: string }>;
  className?: string;
  tone?: BadgeTone;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(items.length);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const row = measureRef.current;
    if (!host || !row) return;

    const update = () => {
      const chips = [...row.querySelectorAll<HTMLElement>('[data-overflow-item]')];
      const plus = row.querySelector<HTMLElement>('[data-overflow-more]');
      const max = host.clientWidth;
      if (max <= 0) return;

      let used = 0;
      let fit = 0;
      for (let i = 0; i < chips.length; i += 1) {
        const chip = chips[i];
        if (!chip) break;
        const width = chip.offsetWidth;
        const remaining = chips.length - i - 1;
        const plusWidth = remaining > 0 && plus ? plus.offsetWidth + GAP : 0;
        const next = used + (i > 0 ? GAP : 0) + width;
        if (next + plusWidth <= max + 0.5) {
          used = next;
          fit += 1;
        } else {
          break;
        }
      }
      setVisible(fit);
    };

    const observer = new ResizeObserver(update);
    observer.observe(host);
    update();
    return () => observer.disconnect();
  }, [items]);

  const hidden = Math.max(0, items.length - visible);
  const rest = items.slice(visible);

  return (
    <div ref={hostRef} className={cn('relative min-w-0', className)}>
      <div
        ref={measureRef}
        className="pointer-events-none invisible absolute inset-x-0 top-0 flex flex-nowrap gap-1.5"
        aria-hidden
      >
        {items.map((item) => (
          <Badge key={item.key} data-overflow-item="" tone={tone}>
            {item.label}
          </Badge>
        ))}
        <Badge data-overflow-more="">+99</Badge>
      </div>
      <div className="flex h-7 flex-nowrap items-center gap-1.5 overflow-hidden">
        {items.slice(0, visible).map((item) => (
          <Badge key={item.key} tone={tone}>
            {item.label}
          </Badge>
        ))}
        {hidden > 0 ? (
          <Badge
            title={rest.map((item) => item.label).join(', ')}
            aria-label={`${String(hidden)} autres : ${rest.map((item) => item.label).join(', ')}`}
          >
            +{hidden}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

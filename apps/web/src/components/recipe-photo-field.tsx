'use client';

import { useId, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button, IconButton, cn } from '@cuisinons/ui';
import { compressRecipePhoto } from '@/lib/recipe-photo';

export function RecipePhotoField({
  preview,
  onChange,
}: {
  preview: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await compressRecipePhoto(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de lire cette image.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink-700">Photo</p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => void applyFile(e.target.files?.[0])}
      />
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl bg-ink-900/5">
          <img src={preview} alt="" className="aspect-[16/10] w-full object-cover" />
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <Button
              type="button"
              variant="glass"
              size="sm"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              Changer
            </Button>
            <IconButton
              icon={Trash2}
              label="Retirer la photo"
              size="sm"
              variant="glass"
              className="text-ink-600 hover:text-tomato-500"
              onClick={() => {
                setError(null);
                onChange(null);
              }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={(e) => {
            e.preventDefault();
            void applyFile(e.dataTransfer.files[0]);
          }}
          className={cn(
            'flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-white/50 px-4 text-center transition duration-200 ease-out-soft hover:border-sage-400 hover:bg-white/80',
            busy && 'opacity-70',
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-sage-100 text-sage-700">
            <ImagePlus className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-medium text-ink-900">
            {busy ? 'Compression…' : 'Ajouter une photo'}
          </span>
          <span className="text-xs text-ink-500">Optionnelle · JPEG, PNG ou WebP</span>
        </button>
      )}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-tomato-500">
          {error}
        </p>
      ) : null}
    </div>
  );
}

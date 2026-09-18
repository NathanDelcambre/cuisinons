export const MAX_PHOTO_BYTES = 400_000;
export const MAX_PHOTO_DATA_URL_LENGTH = 560_000;

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/;

export type RecipePhoto = { mime: string; bytes: Buffer };

export function isPublicPhotoPath(stored: string): boolean {
  return stored.startsWith('/') && !stored.startsWith('data:');
}

export function publicRecipePhotoUrl(
  id: string,
  storedOrHasPhoto: string | boolean | null | undefined,
  updatedAt: Date,
): string | null {
  if (id.startsWith('official-')) return `/recipes/${id}.png`;
  if (typeof storedOrHasPhoto === 'string') {
    if (isPublicPhotoPath(storedOrHasPhoto)) return storedOrHasPhoto;
    return `/api/bff/recipes/${id}/photo?v=${String(updatedAt.getTime())}`;
  }
  if (!storedOrHasPhoto) return null;
  return `/api/bff/recipes/${id}/photo?v=${String(updatedAt.getTime())}`;
}

export function decodePhotoDataUrl(value: string): RecipePhoto {
  const match = DATA_URL.exec(value.trim());
  if (!match?.[1] || !match[2]) {
    throw new Error('Cette photo n’est pas un JPEG, PNG ou WebP.');
  }
  const mime = match[1];
  let bytes: Buffer;
  try {
    bytes = Buffer.from(match[2].replace(/\s+/g, ''), 'base64');
  } catch {
    throw new Error('Cette photo est illisible.');
  }
  if (bytes.length < 24 || bytes.length > MAX_PHOTO_BYTES) {
    throw new Error('Cette photo est trop lourde. Choisis-en une plus légère.');
  }
  if (!looksLikeImage(mime, bytes)) {
    throw new Error('Cette photo est illisible.');
  }
  return { mime, bytes };
}

function looksLikeImage(mime: string, bytes: Buffer): boolean {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (mime === 'image/png') return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

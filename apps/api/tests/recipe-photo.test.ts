import { describe, expect, it } from 'vitest';
import { decodePhotoDataUrl, MAX_PHOTO_BYTES } from '../src/recipes/recipe-photo.js';

function dataUrl(mime: string, bytes: Buffer) {
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

describe('photo de recette', () => {
  it('accepte un JPEG minimal', () => {
    const bytes = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(32, 1), Buffer.from([0xff, 0xd9])]);
    const photo = decodePhotoDataUrl(dataUrl('image/jpeg', bytes));
    expect(photo.mime).toBe('image/jpeg');
    expect(photo.bytes.equals(bytes)).toBe(true);
  });

  it('refuse un GIF', () => {
    expect(() => decodePhotoDataUrl('data:image/gif;base64,R0lGODlhAQABAAAAACw=')).toThrow(/JPEG, PNG ou WebP/);
  });

  it('refuse un JPEG trop lourd', () => {
    const bytes = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.alloc(MAX_PHOTO_BYTES, 1)]);
    expect(() => decodePhotoDataUrl(dataUrl('image/jpeg', bytes))).toThrow(/trop lourde/);
  });
});

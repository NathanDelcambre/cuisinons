const MAX_EDGE = 1280;
const TARGET_BYTES = 350_000;

/**
 * Redimensionne et compresse côté navigateur : l’API n’accepte que ~400 Ko,
 * et une photo de téléphone brute ferait ramer l’enregistrement.
 */
export async function compressRecipePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && file.type !== '') {
    throw new Error('Choisis une image (JPEG, PNG, WebP).');
  }
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Impossible de lire cette image.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > TARGET_BYTES * 1.37 && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrl.length > TARGET_BYTES * 1.4) {
    throw new Error('Cette photo reste trop lourde après compression.');
  }
  return dataUrl;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      return loadHtmlImage(file);
    }
  }
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Ce format n’est pas lisible. Essaie un JPEG ou un PNG.'));
    };
    image.src = url;
  });
}

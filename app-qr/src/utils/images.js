/**
 * Utilities for resolving photo URLs across the mobile frontend.
 */

const isAbsoluteUrl = (value) => /^(https?:\/\/|blob:|data:)/i.test(value);

const getR2BaseUrl = () => process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || '';

export const buildR2PublicUrl = (storagePath) => {
  if (!storagePath) {
    return null;
  }

  if (isAbsoluteUrl(storagePath)) {
    return storagePath;
  }

  const baseUrl = getR2BaseUrl().replace(/\/+$/, '');
  if (!baseUrl) {
    return storagePath;
  }

  const normalizedPath = storagePath.replace(/^\/+/, '');
  return `${baseUrl}/${normalizedPath}`;
};

export const resolvePhotoUrl = (photo) => {
  if (!photo) {
    return null;
  }

  if (typeof photo === 'string') {
    if (photo.startsWith('/photos/')) {
      return photo;
    }
    return buildR2PublicUrl(photo);
  }

  if (photo.public_url) {
    return photo.public_url;
  }

  if (photo.url) {
    return buildR2PublicUrl(photo.url);
  }

  if (photo.imageUrl) {
    return buildR2PublicUrl(photo.imageUrl);
  }

  if (photo.image_url) {
    return buildR2PublicUrl(photo.image_url);
  }

  return buildR2PublicUrl(photo.storage_path);
};

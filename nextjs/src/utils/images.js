/**
 * Utilities for resolving photo URLs across the frontend.
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

const replaceVariantSegment = (value, variant) => {
    if (!variant || variant === 'original') {
        return value;
    }

    return value.replace(/(^|\/)(original|w=\d+)(\/)/, `$1${variant}$3`);
};

const resolveVariantPath = (photo, variant) => {
    if (!photo) {
        return null;
    }

    if (photo.variant_urls && photo.variant_urls[variant]) {
        return photo.variant_urls[variant];
    }

    if (photo.variants && photo.variants[variant]) {
        return buildR2PublicUrl(photo.variants[variant]);
    }

    if (photo.storage_path) {
        return buildR2PublicUrl(replaceVariantSegment(photo.storage_path, variant));
    }

    return null;
};

export const resolvePhotoUrl = (photo, options = {}) => {
    const { variant } = options;
    if (!photo) {
        return null;
    }

    if (typeof photo === 'string') {
        const resolved = replaceVariantSegment(photo, variant);
        if (resolved.startsWith('/photos/')) {
            return resolved;
        }
        return buildR2PublicUrl(resolved);
    }

    if (variant) {
        const variantUrl = resolveVariantPath(photo, variant);
        if (variantUrl) {
            return variantUrl;
        }
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

    if (photo.public_url) {
        return photo.public_url;
    }

    return buildR2PublicUrl(photo.storage_path);
};

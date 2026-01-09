/**
 * Utilities for resolving photo URLs across the frontend.
 */

const isAbsoluteUrl = (value) => /^(https?:\/\/|blob:|data:)/i.test(value);

const getR2BaseUrl = () => process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || '';

const normalizeResolvedUrl = (value) => {
    if (!value) {
        return null;
    }

    if (isAbsoluteUrl(value) || value.startsWith("/")) {
        return value;
    }

    return null;
};

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
        return normalizeResolvedUrl(photo.variant_urls[variant]) || photo.variant_urls[variant];
    }

    if (photo.variants && photo.variants[variant]) {
        const resolved = buildR2PublicUrl(photo.variants[variant]);
        const normalized = normalizeResolvedUrl(resolved);
        if (normalized) {
            return normalized;
        }
    }

    if (photo.storage_path) {
        const resolved = buildR2PublicUrl(replaceVariantSegment(photo.storage_path, variant));
        const normalized = normalizeResolvedUrl(resolved);
        if (normalized) {
            return normalized;
        }
    }

    if (photo.public_url) {
        const resolved = replaceVariantSegment(photo.public_url, variant);
        const normalized = normalizeResolvedUrl(resolved);
        if (normalized) {
            return normalized;
        }
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
        return buildR2PublicUrl(replaceVariantSegment(photo.url, variant));
    }

    if (photo.imageUrl) {
        return buildR2PublicUrl(replaceVariantSegment(photo.imageUrl, variant));
    }

    if (photo.image_url) {
        return buildR2PublicUrl(replaceVariantSegment(photo.image_url, variant));
    }

    if (photo.public_url) {
        const resolved = variant ? replaceVariantSegment(photo.public_url, variant) : photo.public_url;
        return buildR2PublicUrl(resolved);
    }

    return buildR2PublicUrl(replaceVariantSegment(photo.storage_path, variant));
};

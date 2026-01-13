/**
 * Utilities for resolving photo URLs across the frontend.
 */

const isAbsoluteUrl = (value) => /^(https?:\/\/|blob:|data:)/i.test(value);

const getR2BaseUrl = () => process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || '';

const STORAGE_PREFIXES = ["especies", "sectores", "ejemplares", "home"];

const hasVariantSegment = (value) => /(^|\/)(original|w=\d+)(\/)/.test(value);

const prefixVariantIfMissing = (value, variant) => {
    if (!variant || !value || hasVariantSegment(value) || value.startsWith("/photos/")) {
        return value;
    }

    try {
        const parsed = new URL(value);
        const path = parsed.pathname.replace(/^\/+/, "");
        if (!STORAGE_PREFIXES.some((prefix) => path.startsWith(`${prefix}/`))) {
            return value;
        }
        parsed.pathname = `/${variant}/${path}`;
        return parsed.toString();
    } catch {
        const trimmed = value.replace(/^\/+/, "");
        if (!STORAGE_PREFIXES.some((prefix) => trimmed.startsWith(`${prefix}/`))) {
            return value;
        }
        return value.startsWith("/") ? `/${variant}/${trimmed}` : `${variant}/${trimmed}`;
    }
};

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

const replaceVariantExtension = (value) => {
    if (!value) {
        return value;
    }

    const match = value.match(/\.([a-z0-9]+)(\?.*)?$/i);
    if (!match) {
        return value;
    }

    const extension = match[1].toLowerCase();
    if (extension === "jpg" || extension === "jpeg") {
        return value;
    }

    return value.replace(/\.([a-z0-9]+)(\?.*)?$/i, ".jpg$2");
};

const replaceVariantSegment = (value, variant) => {
    if (!variant || variant === 'original') {
        return value;
    }

    const replaced = value.replace(/(^|\/)(original|w=\d+)(\/)/, `$1${variant}$3`);
    if (replaced === value) {
        return value;
    }

    if (/\/w=\d+\//.test(replaced)) {
        return replaceVariantExtension(replaced);
    }

    return replaced;
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
        const resolved = prefixVariantIfMissing(replaceVariantSegment(photo, variant), variant);
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

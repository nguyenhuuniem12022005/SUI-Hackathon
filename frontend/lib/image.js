const ENV_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3001';

const DEFAULT_FALLBACK = 'https://placehold.co/600x400/eee/31343C?text=P-Market';

export const buildAbsoluteImageUrl = (src) => {
  if (!src || typeof src !== 'string') return null;

  const trimmed = src.trim();
  if (!trimmed) return null;

  if (/^(data:|blob:)/i.test(trimmed)) return trimmed;
  if (/^(https?:)?\/\//i.test(trimmed)) {
    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  }

  const cleaned = trimmed.replace(/^public\//i, '').replace(/\\/g, '/');
  const withLeadingSlash = cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  return `${ENV_API_BASE}${withLeadingSlash}`;
};

const normalizeImageCandidate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.length > 0 ? normalizeImageCandidate(value[0]) : null;
    return value.url || value.src || value.path || value.location || null;
  }
  return null;
};

export const resolveProductImage = (product, fallback = DEFAULT_FALLBACK) => {
  if (!product) return fallback;

  const candidates = [
    product.imageURL,
    product.imageUrl,
    product.image,
    product.thumbnail,
    product.primaryImage,
    product.coverImage,
    product.cover,
    Array.isArray(product.images) ? product.images[0] : null,
    Array.isArray(product.photos) ? product.photos[0] : null,
    Array.isArray(product.gallery) ? product.gallery[0] : null,
  ];

  for (const candidate of candidates) {
    const url = buildAbsoluteImageUrl(normalizeImageCandidate(candidate));
    if (url) return url;
  }

  return fallback;
};


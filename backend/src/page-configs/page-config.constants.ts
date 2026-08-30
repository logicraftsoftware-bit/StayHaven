export const PAGE_SLUGS = [
  'home',
  'hotels',
  'villas',
  'resorts',
  'homestays',
  'search',
  'about',
  'contact',
  'list-your-property',
  'account',
  'owner-dashboard',
] as const;
export const SECTION_TYPES = [
  'hero',
  'search',
  'featured-properties',
  'popular-hotels',
  'popular-villas',
  'popular-resorts',
  'popular-homestays',
  'property-categories',
  'destinations',
  'why-choose-us',
  'promotional-banner',
  'testimonials',
  'gallery',
  'faq',
  'cta',
] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_FIELDS: Record<SectionType, readonly string[]> = {
  hero: ['title', 'subtitle', 'style', 'alignment', 'overlay'],
  search: ['title', 'placeholder', 'propertyTypes', 'locationBehavior'],
  'featured-properties': [
    'title',
    'subtitle',
    'limit',
    'layout',
    'propertyType',
  ],
  'popular-hotels': ['title', 'subtitle', 'limit', 'layout'],
  'popular-villas': ['title', 'subtitle', 'limit', 'layout'],
  'popular-resorts': ['title', 'subtitle', 'limit', 'layout'],
  'popular-homestays': ['title', 'subtitle', 'limit', 'layout'],
  'property-categories': ['title', 'subtitle', 'limit'],
  destinations: ['title', 'subtitle', 'limit'],
  'why-choose-us': ['title', 'subtitle'],
  'promotional-banner': ['title', 'description', 'buttonText', 'buttonLink'],
  testimonials: ['title', 'subtitle', 'limit'],
  gallery: ['title', 'subtitle', 'limit'],
  faq: ['title', 'subtitle', 'limit'],
  cta: ['title', 'description', 'buttonText', 'buttonLink'],
};

export const DEFAULT_HOME_SECTIONS = [
  ['hero', {}],
  ['search', {}],
  ['property-categories', { title: 'Browse by property type', limit: 8 }],
  [
    'promotional-banner',
    {
      title: 'Exclusive offers',
      buttonText: 'Explore offers',
      buttonLink: '/hotels',
    },
  ],
  ['destinations', { title: 'Trending Destinations', limit: 6 }],
  [
    'featured-properties',
    {
      title: 'Popular Stays',
      limit: 8,
      layout: 'carousel',
      propertyType: 'all',
    },
  ],
  ['why-choose-us', { title: 'Why book with us?' }],
  [
    'cta',
    {
      title: 'Book anytime, anywhere',
      buttonText: 'Explore stays',
      buttonLink: '/hotels',
    },
  ],
] as const;

export const PAGE_PRESETS = {
  DEFAULT_HOME: DEFAULT_HOME_SECTIONS,
  TRAVEL_HOME: DEFAULT_HOME_SECTIONS,
  MOUNTAIN_HOME: [
    ['hero', { style: 'mountain' }],
    ['search', {}],
    ['destinations', { title: 'Explore mountain destinations', limit: 6 }],
    ['featured-properties', { title: 'Mountain stays', limit: 8 }],
    ['testimonials', { title: 'Guest stories', limit: 6 }],
    ['cta', {}],
  ],
  LUXURY_HOME: [
    ['hero', { style: 'full-image' }],
    ['search', {}],
    ['featured-properties', { title: 'Luxury stays', limit: 8 }],
    ['gallery', { title: 'The experience', limit: 8 }],
    ['testimonials', { title: 'Guest stories', limit: 6 }],
    ['cta', {}],
  ],
  MINIMAL_HOME: [
    ['hero', { style: 'minimal' }],
    ['search', {}],
    ['featured-properties', { title: 'Selected stays', limit: 6 }],
    ['destinations', { title: 'Destinations', limit: 6 }],
    ['cta', {}],
  ],
} as const;

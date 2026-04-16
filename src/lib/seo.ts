/** Central SEO config — single source of truth for all metadata */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://unsaid-pi.vercel.app';
export const SITE_NAME = 'unsaid';
export const SITE_TAGLINE = "say the thing you didn't";
export const SITE_DESCRIPTION =
  'anonymous. ephemeral. gone in 48 hours. no profile. no history. just raw, unfiltered campus truth from LPU.';
export const SITE_DESCRIPTION_LONG =
  'unsaid is an anonymous expression platform for LPU campus. post anything — no name, no face, no account. your post gets 48 hours to live. if people feel it, it survives. if not, it dies. zero trace.';

export const OG_DEFAULTS = {
  siteName: SITE_NAME,
  locale: 'en_US',
  type: 'website' as const,
};

export const TWITTER_DEFAULTS = {
  card: 'summary_large_image' as const,
  site: '@unsaidapp',
  creator: '@unsaidapp',
};

export const KEYWORDS = [
  'unsaid',
  'anonymous',
  'confession',
  'LPU',
  'Lovely Professional University',
  'campus',
  'ephemeral',
  'anonymous posting',
  'college confession',
  'LPU confession',
  'anonymous campus',
  'survival feed',
  'unfiltered',
  'no signup',
  'disappearing posts',
  'campus truth',
  'Phagwara',
  'Punjab',
];

export function canonicalUrl(path: string = ''): string {
  return `${SITE_URL}${path}`;
}

/** JSON-LD for the WebApplication */
export function webAppJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: 'SocialNetworkingApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'unsaid',
      url: SITE_URL,
    },
    aggregateRating: undefined, // add when you have ratings
  };
}

/** JSON-LD for an individual post (Article schema) */
export function postJsonLd(post: {
  id: string;
  content: string;
  city: string;
  feltCount: number;
  replyCount: number;
  createdAt: string;
  expiresAt: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: post.content.slice(0, 110),
    articleBody: post.content,
    datePublished: post.createdAt,
    expires: post.expiresAt,
    url: `${SITE_URL}/post/${post.id}`,
    author: {
      '@type': 'Person',
      name: 'anonymous',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    locationCreated: {
      '@type': 'Place',
      name: `${post.city}, LPU Campus`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Phagwara',
        addressRegion: 'Punjab',
        addressCountry: 'IN',
      },
    },
    interactionStatistic: [
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.feltCount,
      },
      {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: post.replyCount,
      },
    ],
  };
}

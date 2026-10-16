/**
 * Comprehensive IANA Global Country Code Top-Level Domains (ccTLDs)
 * and Generic Top-Level Domains (gTLDs).
 *
 * Enables domain name construction, creative domain hacks (e.g. rad.io, cre.at, delicio.us),
 * and tech domain anagramming.
 */

// All ~250 ISO 3166-1 alpha-2 official and popular active ccTLDs
export const GLOBAL_CCTLDS = [
  'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az',
  'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz',
  'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz',
  'de', 'dj', 'dk', 'dm', 'do', 'dz',
  'ec', 'ee', 'eg', 'er', 'es', 'et', 'eu',
  'fi', 'fj', 'fk', 'fm', 'fo', 'fr',
  'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy',
  'hk', 'hm', 'hn', 'hr', 'ht', 'hu',
  'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it',
  'je', 'jm', 'jo', 'jp',
  'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz',
  'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly',
  'ma', 'mc', 'md', 'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz',
  'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz',
  'om',
  'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py',
  'qa',
  're', 'ro', 'rs', 'ru', 'rw',
  'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'su', 'sv', 'sx', 'sy', 'sz',
  'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tr', 'tt', 'tv', 'tw', 'tz',
  'ua', 'ug', 'uk', 'us', 'uy', 'uz',
  'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu',
  'wf', 'ws',
  'ye', 'yt',
  'za', 'zm', 'zw',
] as const;

// Comprehensive standard and new gTLDs
export const GLOBAL_GTLDS = [
  // Classic Infrastructure & Web
  'com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name', 'pro', 'aero', 'coop', 'museum',
  // Modern Tech & Developer
  'app', 'dev', 'io', 'ai', 'xyz', 'tech', 'site', 'online', 'store', 'shop', 'cloud', 'space', 'code', 'build',
  'host', 'digital', 'network', 'systems', 'solutions', 'data', 'bot', 'page', 'web', 'link', 'click', 'download',
  // Creative, Media & Entertainment
  'art', 'design', 'blog', 'live', 'news', 'media', 'press', 'wiki', 'studio', 'agency', 'audio', 'band', 'video',
  'photo', 'photos', 'film', 'movie', 'radio', 'show', 'theater', 'theatre', 'music', 'game', 'games', 'play',
  // Lifestyle, Social & Community
  'club', 'world', 'zone', 'center', 'group', 'today', 'family', 'life', 'style', 'guru', 'ninja', 'expert',
  'guide', 'tips', 'help', 'care', 'community', 'social', 'chat', 'email', 'love', 'date', 'dating', 'singles',
  'fun', 'cool', 'wtf', 'lol', 'vip', 'top', 'run', 'win', 'bid', 'plus', 'one', 'box', 'fast', 'free',
  // Commerce, Finance & Business
  'company', 'ventures', 'enterprises', 'holding', 'holdings', 'capital', 'fund', 'finance', 'financial',
  'market', 'marketing', 'agency', 'consulting', 'management', 'deals', 'sale', 'promo', 'discount', 'cheap',
  'auction', 'trade', 'trading', 'money', 'cash', 'credit', 'bank', 'investments', 'exchange', 'estate', 'realty',
  // Geography & City TLDs
  'city', 'town', 'land', 'earth', 'global', 'asia', 'africa', 'tokyo', 'london', 'nyc', 'paris', 'berlin',
  'miami', 'vegas', 'sydney', 'boston', 'amsterdam', 'dubai', 'madrid', 'roma',
  // Food, Drink & Hospitality
  'cafe', 'bar', 'pub', 'pizza', 'beer', 'wine', 'coffee', 'kitchen', 'restaurant', 'recipes', 'menu', 'eat',
  // Sports, Fitness & Health
  'fit', 'fitness', 'yoga', 'gym', 'health', 'clinic', 'dental', 'doctor', 'med', 'care', 'sport', 'sports',
  'football', 'soccer', 'golf', 'tennis', 'hockey', 'bike', 'ski', 'surf', 'camp',
  // Science, Education & Knowledge
  'science', 'bio', 'eco', 'green', 'farm', 'nature', 'school', 'academy', 'college', 'university', 'courses',
  'study', 'degree', 'fyi', 'how', 'search',
  // Crypto, Web3 & Next-Gen
  'crypto', 'eth', 'sol', 'nft', 'meta', 'dao', 'web3',
] as const;

// Deduplicated master list of all lowercase alphanumeric TLD strings
const allTldsList: string[] = [];
const seenTlds = new Set<string>();

for (const t of [...GLOBAL_CCTLDS, ...GLOBAL_GTLDS]) {
  const clean = t.toLowerCase().trim();
  if (clean && !seenTlds.has(clean)) {
    seenTlds.add(clean);
    allTldsList.push(clean);
  }
}

export const GLOBAL_TLDS: readonly string[] = allTldsList;
export const GLOBAL_TLDS_SET: ReadonlySet<string> = seenTlds;

/**
 * Checks if a word is an officially recognized global ccTLD or gTLD.
 */
export function isTLD(word: string): boolean {
  if (!word) return false;
  return GLOBAL_TLDS_SET.has(word.toLowerCase());
}

/**
 * Categorizes a TLD for UI display or filtering.
 */
export function getTLDCategory(tld: string): 'ccTLD' | 'tech' | 'classic' | 'creative' | 'business' | 'other' {
  const w = tld.toLowerCase();
  if (w === 'com' || w === 'net' || w === 'org' || w === 'edu' || w === 'gov') return 'classic';
  if (w === 'ai' || w === 'io' || w === 'dev' || w === 'app' || w === 'tech' || w === 'cloud' || w === 'code') return 'tech';
  if (w === 'design' || w === 'art' || w === 'studio' || w === 'media' || w === 'photo' || w === 'video') return 'creative';
  if (w.length === 2) return 'ccTLD';
  if (w === 'store' || w === 'shop' || w === 'market' || w === 'biz' || w === 'capital' || w === 'finance') return 'business';
  return 'other';
}

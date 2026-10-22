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
  // Additional Delegated ICANN Word gTLDs for Anagramming
  'real', 'loan', 'loans', 'auto', 'cars', 'car', 'work', 'works', 'rest', 'best', 'next', 'now', 'new',
  'open', 'read', 'red', 'blue', 'gold', 'pink', 'rent', 'rich', 'save', 'safe', 'seat', 'seek', 'skin',
  'song', 'spot', 'star', 'talk', 'team', 'taxi', 'tour', 'toys', 'vote', 'voto', 'wed', 'wire', 'wood',
  'zero', 'law', 'dad', 'mom', 'dog', 'cat', 'pet', 'vet', 'men', 'ceo', 'fan', 'fans', 'map', 'maps',
  'cab', 'air', 'fly', 'pay', 'buy', 'day', 'ink', 'ice', 'hot', 'pop', 'ren', 'soy', 'tel', 'uno', 'vin',
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
  if (
    w === 'ai' || w === 'io' || w === 'dev' || w === 'app' || w === 'tech' ||
    w === 'cloud' || w === 'code' || w === 'web' || w === 'data' || w === 'bot' || w === 'xyz'
  ) {
    return 'tech';
  }
  if (
    w === 'design' || w === 'art' || w === 'studio' || w === 'media' || w === 'photo' ||
    w === 'video' || w === 'audio' || w === 'radio' || w === 'music' || w === 'film' ||
    w === 'show' || w === 'game' || w === 'games' || w === 'play' || w === 'song' || w === 'star'
  ) {
    return 'creative';
  }
  if (
    w === 'store' || w === 'shop' || w === 'market' || w === 'biz' || w === 'capital' ||
    w === 'finance' || w === 'loan' || w === 'loans' || w === 'sale' || w === 'deals' ||
    w === 'money' || w === 'cash' || w === 'fund' || w === 'bank' || w === 'trade' ||
    w === 'work' || w === 'works' || w === 'pro' || w === 'law' || w === 'real' || w === 'rent'
  ) {
    return 'business';
  }
  if (w.length === 2) return 'ccTLD';
  return 'other';
}

const TIER_1_TLDS = new Set([
  'com', 'org', 'net', 'io', 'ai', 'co', 'app', 'dev', 'us', 'me', 'tv', 'edu', 'gov',
]);

const TIER_2_TLDS = new Set([
  'to', 'is', 'so', 'it', 'in', 'at', 'do', 'be', 'la', 'ws', 'de', 'uk', 'ca', 'fr', 'es', 'nl',
  'se', 'no', 'ch', 'au', 'nz', 'jp', 'kr', 'br', 'mx', 'ar', 'gg', 'fm', 'am', 'sh', 'ly', 'gl',
  'vc', 'cc', 'xyz', 'tech', 'site', 'live', 'news', 'art', 'design', 'studio', 'media', 'world',
  'zone', 'land', 'life', 'love', 'club', 'team', 'work', 'pro', 'one', 'run', 'win', 'now', 'new',
  'best', 'real', 'loan', 'loans', 'sale', 'deals', 'store', 'shop', 'money', 'cash', 'fund', 'bank',
  'law', 'care', 'auto', 'cars', 'car', 'wood', 'gold', 'red', 'blue', 'star', 'spot', 'song',
  'read', 'open', 'safe', 'save', 'fun', 'cool', 'top', 'plus', 'fast', 'free', 'bio', 'eco',
  'green', 'farm', 'cafe', 'bar', 'pub', 'fit', 'gym', 'golf', 'ski', 'surf', 'camp',
]);

/**
 * Returns a quality/recognizability score for a TLD (higher = more recognizable website extension).
 */
export function getTLDQualityScore(tld: string): number {
  const w = tld.toLowerCase();
  if (!GLOBAL_TLDS_SET.has(w)) return 0;
  if (TIER_1_TLDS.has(w)) return 75;
  if (TIER_2_TLDS.has(w)) return 52;
  if (w.length >= 3) return 38;
  return 24;
}

const SUBDOMAIN_PREFIX_WORDS = new Set([
  'go', 'my', 'we', 'get', 'try', 'the', 'app', 'web', 'dev', 'pro', 'now', 'new', 'one',
  'all', 'our', 'see', 'use', 'ask', 'hey', 'hi', 'no', 'on', 'in', 'to', 'be', 'do', 'so',
]);

/**
 * Converts a list of anagram words into a structured Website URL if at least one word is a valid TLD.
 */
export function formatWordsAsWebsite(words: string[]): {
  url: string;
  domain: string;
  tld: string;
  tldCategory: 'ccTLD' | 'tech' | 'classic' | 'creative' | 'business' | 'other';
  format: 'domain' | 'subdomain' | 'url-path' | 'domain-hack';
  qualityBonus: number;
} | null {
  if (!words || words.length === 0) return null;
  const cleanWords = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, '')).filter(Boolean);

  // Case 1: Single word domain hack (e.g., "radio" -> "rad.io", "delicious" -> "delicio.us")
  if (cleanWords.length === 1) {
    const single = cleanWords[0];
    if (single.length >= 4) {
      for (let tldLen = 4; tldLen >= 2; tldLen--) {
        if (single.length - tldLen < 2) continue;
        const suffix = single.slice(-tldLen);
        if (isTLD(suffix)) {
          const stem = single.slice(0, single.length - tldLen);
          const url = `${stem}.${suffix}`;
          return {
            url,
            domain: url,
            tld: suffix,
            tldCategory: getTLDCategory(suffix),
            format: 'domain-hack',
            qualityBonus: getTLDQualityScore(suffix) + 15,
          };
        }
      }
    }
    return null;
  }

  // Find the best TLD candidate among the words
  let bestTldIdx = -1;
  let bestTldScore = -1;

  for (let i = 0; i < cleanWords.length; i++) {
    const w = cleanWords[i];
    if (isTLD(w)) {
      const q = getTLDQualityScore(w);
      if (q > bestTldScore) {
        bestTldScore = q;
        bestTldIdx = i;
      }
    }
  }

  if (bestTldIdx === -1) return null;

  const tld = cleanWords[bestTldIdx];
  const otherWords = cleanWords.filter((_, idx) => idx !== bestTldIdx);
  if (otherWords.length === 0) return null;

  const tldCategory = getTLDCategory(tld);

  if (otherWords.length === 1) {
    const domain = `${otherWords[0]}.${tld}`;
    return {
      url: domain,
      domain,
      tld,
      tldCategory,
      format: 'domain',
      qualityBonus: bestTldScore + 25,
    };
  }

  if (otherWords.length === 2) {
    const [w1, w2] = otherWords;
    // If first word is a natural subdomain prefix (e.g. "go", "my", "we", "on", "new"), format as sub.domain.tld
    if (SUBDOMAIN_PREFIX_WORDS.has(w1) && w2.length >= 3) {
      const domain = `${w1}.${w2}.${tld}`;
      return {
        url: domain,
        domain,
        tld,
        tldCategory,
        format: 'subdomain',
        qualityBonus: bestTldScore + 18,
      };
    }
    // Otherwise compound domain w1w2.tld
    const domain = `${w1}${w2}.${tld}`;
    return {
      url: domain,
      domain,
      tld,
      tldCategory,
      format: 'domain',
      qualityBonus: bestTldScore + 20,
    };
  }

  // 3+ other words: compound domain + path (e.g. word1word2.tld/word3)
  const sortedOthers = [...otherWords].sort((a, b) => b.length - a.length);
  const hostPart = `${sortedOthers[0]}${sortedOthers[1]}`;
  const pathPart = sortedOthers.slice(2).join('-');
  const domain = `${hostPart}.${tld}`;
  const url = `${domain}/${pathPart}`;

  return {
    url,
    domain,
    tld,
    tldCategory,
    format: 'url-path',
    qualityBonus: bestTldScore + 12,
  };
}


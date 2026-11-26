import axios from 'axios';

const COUNTRY_FALLBACK = [
  { name: 'United States', iso2: 'US', comtradeCode: 842, aliases: ['usa', 'us', 'united states', 'united states of america', 'america'] },
  { name: 'United Kingdom', iso2: 'GB', comtradeCode: 826, aliases: ['uk', 'gb', 'united kingdom', 'britain', 'great britain', 'england'] },
  { name: 'Germany', iso2: 'DE', comtradeCode: 276, aliases: ['de', 'germany', 'deutschland'] },
  { name: 'France', iso2: 'FR', comtradeCode: 251, aliases: ['fr', 'france'] },
  { name: 'Canada', iso2: 'CA', comtradeCode: 124, aliases: ['ca', 'canada'] },
  { name: 'India', iso2: 'IN', comtradeCode: 699, aliases: ['in', 'india'] },
  { name: 'China', iso2: 'CN', comtradeCode: 156, aliases: ['cn', 'china', 'prc'] },
  { name: 'Japan', iso2: 'JP', comtradeCode: 392, aliases: ['jp', 'japan'] },
  { name: 'Netherlands', iso2: 'NL', comtradeCode: 528, aliases: ['nl', 'netherlands', 'holland'] },
  { name: 'Italy', iso2: 'IT', comtradeCode: 381, aliases: ['it', 'italy'] },
  { name: 'Spain', iso2: 'ES', comtradeCode: 724, aliases: ['es', 'spain'] },
  { name: 'Australia', iso2: 'AU', comtradeCode: 36, aliases: ['au', 'australia'] },
  { name: 'United Arab Emirates', iso2: 'AE', comtradeCode: 784, aliases: ['ae', 'uae', 'united arab emirates', 'dubai'] },
  { name: 'Singapore', iso2: 'SG', comtradeCode: 702, aliases: ['sg', 'singapore'] },
  { name: 'Brazil', iso2: 'BR', comtradeCode: 76, aliases: ['br', 'brazil'] },
  { name: 'Mexico', iso2: 'MX', comtradeCode: 484, aliases: ['mx', 'mexico'] },
  { name: 'South Korea', iso2: 'KR', comtradeCode: 410, aliases: ['kr', 'south korea', 'korea', 'republic of korea'] },
  { name: 'Switzerland', iso2: 'CH', comtradeCode: 757, aliases: ['ch', 'switzerland'] },
  { name: 'Belgium', iso2: 'BE', comtradeCode: 56, aliases: ['be', 'belgium'] },
  { name: 'Sweden', iso2: 'SE', comtradeCode: 752, aliases: ['se', 'sweden'] },
  { name: 'Poland', iso2: 'PL', comtradeCode: 616, aliases: ['pl', 'poland'] },
  { name: 'Turkey', iso2: 'TR', comtradeCode: 792, aliases: ['tr', 'turkey', 'turkiye'] },
  { name: 'Vietnam', iso2: 'VN', comtradeCode: 704, aliases: ['vn', 'vietnam', 'viet nam'] },
  { name: 'Saudi Arabia', iso2: 'SA', comtradeCode: 682, aliases: ['sa', 'saudi arabia', 'ksa'] },
  { name: 'South Africa', iso2: 'ZA', comtradeCode: 710, aliases: ['za', 'south africa'] },
];

const HS_CHAPTER_MAP = [
  { keywords: ['textile', 'textiles', 'cotton', 'fabric', 'yarn', 'linen', 'weaving', 'woven', 'silk', 'wool'], cmdCode: '52', label: 'HS 52-63: Textiles & Cotton Fabrics', searchTerms: ['textile', 'fabric', 'apparel'] },
  { keywords: ['apparel', 'garment', 'garments', 'clothing', 'fashion', 'knitwear', 'shirt', 'trouser'], cmdCode: '62', label: 'HS 61-62: Apparel & Clothing', searchTerms: ['apparel', 'clothing', 'garment'] },
  { keywords: ['coffee', 'tea', 'spice', 'spices', 'pepper', 'cardamom', 'turmeric'], cmdCode: '09', label: 'HS 09: Coffee, Tea & Spices', searchTerms: ['coffee', 'tea', 'spice'] },
  { keywords: ['grain', 'rice', 'wheat', 'cereal', 'food', 'agro', 'agriculture'], cmdCode: '10', label: 'HS 10: Cereals & Agricultural Goods', searchTerms: ['food', 'grain', 'agri'] },
  { keywords: ['electronic', 'electronics', 'semiconductor', 'solar', 'led', 'electrical', 'cable', 'battery'], cmdCode: '85', label: 'HS 85: Electrical Machinery & Electronics', searchTerms: ['electronics', 'electrical', 'semiconductor'] },
  { keywords: ['machinery', 'industrial', 'machine', 'equipment', 'pump', 'turbine', 'hardware'], cmdCode: '84', label: 'HS 84: Industrial Machinery & Equipment', searchTerms: ['machinery', 'industrial', 'equipment'] },
  { keywords: ['pharma', 'pharmaceutical', 'medicine', 'medical', 'healthcare', 'drug'], cmdCode: '30', label: 'HS 30: Pharmaceutical Products', searchTerms: ['pharma', 'medical', 'healthcare'] },
  { keywords: ['chemical', 'chemicals', 'polymer', 'resin', 'organic'], cmdCode: '29', label: 'HS 29: Organic Chemicals', searchTerms: ['chemical', 'chemicals'] },
  { keywords: ['plastic', 'plastics', 'packaging', 'polymer'], cmdCode: '39', label: 'HS 39: Plastics & Packaging', searchTerms: ['plastics', 'packaging'] },
  { keywords: ['leather', 'footwear', 'shoe', 'shoes', 'bag', 'handbag'], cmdCode: '42', label: 'HS 42/64: Leather Goods & Footwear', searchTerms: ['leather', 'footwear'] },
  { keywords: ['steel', 'iron', 'metal', 'aluminum', 'aluminium', 'alloy'], cmdCode: '72', label: 'HS 72: Iron & Steel', searchTerms: ['steel', 'metal', 'iron'] },
  { keywords: ['auto', 'automotive', 'vehicle', 'parts', 'spare'], cmdCode: '87', label: 'HS 87: Vehicles & Auto Components', searchTerms: ['automotive', 'auto', 'motors'] },
  { keywords: ['furniture', 'wood', 'timber', 'home decor', 'handicraft'], cmdCode: '94', label: 'HS 94: Furniture & Home Goods', searchTerms: ['furniture', 'wood', 'home'] },
  { keywords: ['cosmetic', 'cosmetics', 'beauty', 'skincare', 'perfume'], cmdCode: '33', label: 'HS 33: Essential Oils & Cosmetics', searchTerms: ['cosmetics', 'beauty'] },
];

let cachedReporters = null;
let cachedPartners = null;

export async function getComtradeReferences() {
  if (cachedReporters && cachedPartners) {
    return { reporters: cachedReporters, partners: cachedPartners };
  }
  try {
    const [repRes, partRes] = await Promise.all([
      axios.get('https://comtradeapi.un.org/files/v1/app/reference/Reporters.json', { timeout: 6000 }),
      axios.get('https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json', { timeout: 6000 }),
    ]);
    cachedReporters = repRes.data?.results || [];
    cachedPartners = partRes.data?.results || [];
  } catch {
    cachedReporters = cachedReporters || [];
    cachedPartners = cachedPartners || [];
  }
  return { reporters: cachedReporters, partners: cachedPartners };
}

export async function resolveCountry(input) {
  const raw = (input || '').trim();
  if (!raw) {
    return { name: 'United States', iso2: 'US', comtradeCode: 842 };
  }
  const normalized = raw.toLowerCase();

  const localMatch = COUNTRY_FALLBACK.find(
    (c) => c.name.toLowerCase() === normalized || c.iso2.toLowerCase() === normalized || c.aliases.includes(normalized)
  );
  if (localMatch) {
    return { name: localMatch.name, iso2: localMatch.iso2, comtradeCode: localMatch.comtradeCode };
  }

  const { reporters } = await getComtradeReferences();
  const remoteMatch = reporters.find((r) => {
    const desc = (r.reporterDesc || r.text || '').toLowerCase();
    const iso2 = (r.reporterCodeIsoAlpha2 || '').toLowerCase();
    const iso3 = (r.reporterCodeIsoAlpha3 || '').toLowerCase();
    return desc === normalized || iso2 === normalized || iso3 === normalized || desc.includes(normalized);
  });

  if (remoteMatch) {
    return {
      name: remoteMatch.reporterDesc || remoteMatch.text,
      iso2: remoteMatch.reporterCodeIsoAlpha2 || raw.slice(0, 2).toUpperCase(),
      comtradeCode: Number(remoteMatch.reporterCode || remoteMatch.id),
    };
  }

  return {
    name: raw,
    iso2: raw.length === 2 ? raw.toUpperCase() : undefined,
    comtradeCode: 842,
  };
}

export function resolveCommodity(productInput, industryInput = '') {
  const raw = (productInput || '').trim();
  const combined = `${raw} ${industryInput}`.toLowerCase();

  // Direct HS code entry (e.g., "52", "5208", "854110")
  if (/^\d{2,6}$/.test(raw)) {
    const chapter = raw.slice(0, 2);
    const chapterMatch = HS_CHAPTER_MAP.find((item) => item.cmdCode === chapter);
    return {
      cmdCode: raw,
      label: chapterMatch ? `${chapterMatch.label} (HS ${raw})` : `HS Commodity ${raw}`,
      searchKeywords: chapterMatch ? chapterMatch.searchTerms : [raw],
      isHsCode: true,
    };
  }

  for (const entry of HS_CHAPTER_MAP) {
    if (entry.keywords.some((kw) => combined.includes(kw))) {
      const cleaned = raw.replace(/[^a-zA-Z0-9\s-]/g, ' ').trim();
      const baseTokens = cleaned ? [cleaned] : [];
      // Add singular variant if plural (e.g. Textiles -> Textile)
      if (cleaned.toLowerCase().endsWith('s') && cleaned.length > 4) {
        baseTokens.push(cleaned.slice(0, -1));
      }
      const searchKeywords = [...new Set([...baseTokens, ...entry.searchTerms])];
      return {
        cmdCode: entry.cmdCode,
        label: entry.label,
        searchKeywords,
        isHsCode: false,
      };
    }
  }

  const fallbackTerms = raw ? [raw] : ['Import'];
  if (raw.toLowerCase().endsWith('s') && raw.length > 4) {
    fallbackTerms.push(raw.slice(0, -1));
  }
  return {
    cmdCode: 'TOTAL',
    label: raw ? `General Trade: ${raw}` : 'All Commodities (TOTAL)',
    searchKeywords: [...new Set(fallbackTerms)],
    isHsCode: false,
  };
}

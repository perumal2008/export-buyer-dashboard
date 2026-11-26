import axios from 'axios';
import { config } from '../config/env.js';
import { resolveCountry, resolveCommodity } from '../utils/tradeMapping.js';
import { fetchComtradeTradeContext } from './comtradeService.js';

const LEGAL_SUFFIX_REGEX = /\b(inc|incorporated|llc|ltd|limited|corp|corporation|co|company|gmbh|ag|sa|sarl|bv|nv|plc|pty|pte|lp|llp|holdings|group|international|intl)\b\.?/gi;

function cleanCompanyBaseName(name = '') {
  return name
    .replace(/[,()]/g, ' ')
    .replace(LEGAL_SUFFIX_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isStrongDomainMatch(companyName, candidate) {
  if (!candidate?.domain) return false;
  const cleanCompany = cleanCompanyBaseName(companyName).toLowerCase();
  const companyTokens = cleanCompany.split(/\s+/).filter((t) => t.length >= 3);
  if (companyTokens.length === 0) return false;

  const candidateName = (candidate.name || '').toLowerCase();
  const domainBase = candidate.domain.split('.')[0].toLowerCase();

  // Primary brand token must match either domain base or candidate company name
  const firstToken = companyTokens[0];
  if (domainBase.includes(firstToken) || (firstToken.length >= 4 && candidateName.includes(firstToken))) {
    return true;
  }

  const matchedTokens = companyTokens.filter(
    (t) => candidateName.includes(t) || domainBase.includes(t)
  );
  return matchedTokens.length >= Math.min(2, companyTokens.length);
}

async function enrichDomainViaClearbit(companyName) {
  const query = cleanCompanyBaseName(companyName) || companyName;
  if (!query || query.length < 3) return null;
  try {
    const res = await axios.get('https://autocomplete.clearbit.com/v1/companies/suggest', {
      params: { query },
      timeout: 3500,
    });
    const list = Array.isArray(res.data) ? res.data : [];
    const match = list.find((item) => isStrongDomainMatch(companyName, item));
    if (!match) return null;
    return {
      domain: match.domain,
      website: `https://${match.domain}`,
      logo: match.logo || null,
      matchedName: match.name,
    };
  } catch {
    return null;
  }
}

async function enrichDomainViaHunter(domain) {
  if (!config.hunterApiKey || !domain) return null;
  try {
    const res = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: {
        domain,
        api_key: config.hunterApiKey,
        limit: 3,
      },
      timeout: 5000,
    });
    const emails = res.data?.data?.emails || [];
    if (emails.length === 0) return null;
    // Prefer procurement / purchasing / buyer / executive contacts
    const preferred =
      emails.find((e) => /procure|purchas|buy|import|supply|sourc|director|vp|ceo/i.test(e.position || '')) ||
      emails[0];
    return {
      buyerName: [preferred.first_name, preferred.last_name].filter(Boolean).join(' ') || null,
      role: preferred.position || 'Procurement Contact',
      email: preferred.value,
      confidence: preferred.confidence || null,
      emailStatus: 'Verified (Hunter.io)',
      linkedin: preferred.linkedin || null,
    };
  } catch {
    return null;
  }
}

async function queryApolloBuyers({ product, countryInfo, industry, role }) {
  if (!config.apolloApiKey) {
    return { status: 'skipped', reason: 'APOLLO_API_KEY not configured', buyers: [] };
  }
  const startedAt = Date.now();
  try {
    const qKeywords = [product, industry].filter(Boolean).join(' ').trim();
    const payload = {
      q_keywords: qKeywords || 'Import Wholesale',
      person_titles: role
        ? [role, 'Procurement Manager', 'Purchasing Director', 'Import Manager']
        : ['Importer', 'Wholesale Buyer', 'Procurement Manager', 'Purchasing Director'],
      organization_locations: countryInfo?.name ? [countryInfo.name] : undefined,
      page: 1,
      per_page: 20,
    };

    const res = await axios.post('https://api.apollo.io/api/v1/mixed_people/api_search', payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': config.apolloApiKey,
      },
      timeout: 8000,
    });

    const people = res.data?.people || [];
    const buyers = people.map((person, idx) => {
      const org = person.organization || {};
      const domain = org.primary_domain || (org.website_url ? org.website_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : null);
      return {
        id: `apollo-${person.id || idx}`,
        companyName: org.name || person.organization_name || 'Unknown Company',
        buyerName: person.name || [person.first_name, person.last_name].filter(Boolean).join(' ') || 'Procurement Lead',
        role: person.title || role || 'Procurement Manager',
        email: person.email && !person.email.includes('email_not_unlocked') ? person.email : (domain ? `procurement@${domain}` : null),
        emailStatus: person.email && !person.email.includes('email_not_unlocked') ? 'Verified (Apollo.io)' : 'Domain Inferred',
        website: org.website_url || (domain ? `https://${domain}` : null),
        domain,
        logo: org.logo_url || null,
        country: org.country || countryInfo.name,
        countryCode: countryInfo.iso2 || '',
        city: person.city || org.city || '',
        region: person.state || org.state || '',
        address: [person.city || org.city, person.state || org.state, org.country || countryInfo.name].filter(Boolean).join(', '),
        industry: org.industry || industry || product || 'International Trade',
        product: product || 'General Merchandise',
        registrationNumber: null,
        lei: null,
        entityStatus: 'ACTIVE',
        registryUrl: person.linkedin_url || org.linkedin_url || null,
        source: 'Apollo.io Search API',
      };
    });

    return {
      status: buyers.length > 0 ? 'ok' : 'empty',
      httpStatus: res.status,
      latencyMs: Date.now() - startedAt,
      records: buyers.length,
      buyers,
    };
  } catch (err) {
    return {
      status: 'error',
      httpStatus: err.response?.status || 0,
      latencyMs: Date.now() - startedAt,
      reason: err.response?.data?.message || err.message,
      buyers: [],
    };
  }
}

async function queryOpenCorporates({ keywords, countryInfo, product, industry, role }) {
  const startedAt = Date.now();
  try {
    const params = {
      q: keywords[0] || product || 'import',
      per_page: 15,
    };
    if (countryInfo?.iso2) {
      params.country_code = countryInfo.iso2.toLowerCase();
    }
    if (config.openCorporatesApiKey) {
      params.api_token = config.openCorporatesApiKey;
    }

    const res = await axios.get('https://api.opencorporates.com/v0.4/companies/search', {
      params,
      timeout: 4500,
    });

    const companies = res.data?.results?.companies || [];
    const buyers = companies.map((entry) => {
      const c = entry.company || entry;
      return {
        id: `oc-${c.jurisdiction_code}-${c.company_number}`,
        companyName: c.name,
        buyerName: 'Procurement & Sourcing Desk',
        role: role || 'Importer / Procurement Manager',
        email: null,
        emailStatus: 'Registry Entity',
        website: null,
        domain: null,
        logo: null,
        country: countryInfo.name,
        countryCode: countryInfo.iso2 || (c.jurisdiction_code || '').slice(0, 2).toUpperCase(),
        city: '',
        region: (c.jurisdiction_code || '').toUpperCase(),
        address: c.registered_address_in_full || `${countryInfo.name}`,
        industry: industry || product || 'Wholesale & Import Trade',
        product: product || keywords[0],
        registrationNumber: c.company_number,
        lei: null,
        entityStatus: c.current_status || 'Active',
        foundedDate: c.incorporation_date || null,
        registryUrl: c.opencorporates_url || null,
        source: 'OpenCorporates API',
      };
    });

    return {
      status: buyers.length > 0 ? 'ok' : 'empty',
      httpStatus: res.status,
      latencyMs: Date.now() - startedAt,
      records: buyers.length,
      buyers,
    };
  } catch (err) {
    const httpStatus = err.response?.status || 0;
    const msg = err.response?.data?.error?.message || err.message;
    return {
      status: 'fallback',
      httpStatus,
      latencyMs: Date.now() - startedAt,
      reason: httpStatus === 401
        ? `${msg} — automatically cascaded to GLEIF Public Registry`
        : msg,
      buyers: [],
    };
  }
}

async function queryGleifBuyers({ keywords, countryInfo, product, industry, role }) {
  const startedAt = Date.now();
  const countryIso2 = countryInfo?.iso2;
  const searchList = [...new Set(keywords.filter(Boolean))].slice(0, 3);
  if (searchList.length === 0) searchList.push('import');

  const collected = new Map();
  let lastHttpStatus = 200;

  // Query primary keyword first; if fewer than 12 entities, broaden with next keyword(s)
  for (const term of searchList) {
    if (collected.size >= 18) break;
    try {
      const params = {
        'filter[fulltext]': term,
        'page[size]': 20,
      };
      if (countryIso2) {
        params['filter[entity.legalAddress.country]'] = countryIso2;
      }

      const res = await axios.get('https://api.gleif.org/api/v1/lei-records', {
        params,
        timeout: 7000,
      });
      lastHttpStatus = res.status;
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];

      for (const row of rows) {
        if (!collected.has(row.id)) {
          collected.set(row.id, row);
        }
      }
    } catch (err) {
      lastHttpStatus = err.response?.status || lastHttpStatus;
    }
  }

  // If country filter yielded very few records for a niche term, run an entity.legalName fallback in the country
  if (collected.size < 4 && countryIso2 && searchList[0]) {
    try {
      const res = await axios.get('https://api.gleif.org/api/v1/lei-records', {
        params: {
          'filter[entity.legalName]': searchList[0],
          'filter[entity.legalAddress.country]': countryIso2,
          'page[size]': 15,
        },
        timeout: 6000,
      });
      for (const row of res.data?.data || []) {
        if (!collected.has(row.id)) {
          collected.set(row.id, row);
        }
      }
    } catch {
      // Ignore secondary query error
    }
  }

  const rawEntities = Array.from(collected.values()).slice(0, 20);

  // Enrich top 15 entities in parallel with Clearbit company domains (and Hunter.io if configured)
  const enriched = await Promise.all(
    rawEntities.map(async (row, index) => {
      const entity = row.attributes?.entity || {};
      const legalName = entity.legalName?.name || 'Registered Entity';
      const addr = entity.headquartersAddress?.city ? entity.headquartersAddress : (entity.legalAddress || {});
      const addressParts = [
        ...(Array.isArray(addr.addressLines) ? addr.addressLines : []),
        addr.city,
        addr.region,
        addr.postalCode,
      ].filter(Boolean);

      const clearbit = index < 15 ? await enrichDomainViaClearbit(legalName) : null;
      const hunter = clearbit?.domain ? await enrichDomainViaHunter(clearbit.domain) : null;

      const domain = clearbit?.domain || null;
      const fallbackDeptEmail = domain ? `procurement@${domain}` : null;

      return {
        id: `gleif-${row.id}`,
        companyName: legalName,
        buyerName: hunter?.buyerName || 'Procurement & Import Desk',
        role: hunter?.role || role || 'Importer / Wholesale Buyer',
        email: hunter?.email || fallbackDeptEmail,
        emailStatus: hunter?.email
          ? hunter.emailStatus
          : domain
            ? 'Domain Inferred'
            : 'Registry Entity (Add Apollo/Hunter for email)',
        website: clearbit?.website || null,
        domain,
        logo: clearbit?.logo || null,
        country: countryInfo.name,
        countryCode: addr.country || countryInfo.iso2 || '',
        city: addr.city || '',
        region: addr.region || entity.jurisdiction || '',
        address: addressParts.join(', ') || countryInfo.name,
        industry: industry || product || 'International Trade',
        product: product || searchList[0],
        registrationNumber: entity.registeredAs || null,
        lei: row.id,
        entityStatus: entity.status || 'ACTIVE',
        foundedDate: entity.creationDate ? entity.creationDate.slice(0, 10) : null,
        registryUrl: `https://search.gleif.org/#/record/${row.id}`,
        source: hunter ? 'GLEIF Registry + Hunter.io' : clearbit ? 'GLEIF Registry + Clearbit' : 'GLEIF Public Registry',
      };
    })
  );

  // Sort active entities with matched domains/websites first for better actionability
  enriched.sort((a, b) => {
    const scoreA = (a.entityStatus === 'ACTIVE' ? 2 : 0) + (a.domain ? 2 : 0) + (a.email ? 1 : 0);
    const scoreB = (b.entityStatus === 'ACTIVE' ? 2 : 0) + (b.domain ? 2 : 0) + (b.email ? 1 : 0);
    return scoreB - scoreA;
  });

  return {
    status: enriched.length > 0 ? 'ok' : 'empty',
    httpStatus: lastHttpStatus,
    latencyMs: Date.now() - startedAt,
    records: enriched.length,
    matchedDomains: enriched.filter((b) => Boolean(b.domain)).length,
    buyers: enriched,
  };
}

export async function discoverBuyers({ product = '', country = '', industry = '', role = '' }) {
  const startedAt = Date.now();
  const [countryInfo, commodityInfo] = await Promise.all([
    resolveCountry(country),
    Promise.resolve(resolveCommodity(product, industry)),
  ]);

  const comtradePromise = fetchComtradeTradeContext({ countryInfo, commodityInfo });
  const providerTrace = [];
  let buyers = [];
  let primarySource = 'Live Open-Data Fallback';
  let mode = 'open-data-live';

  // 1. Primary Live Data Integration: Apollo.io (when APOLLO_API_KEY configured)
  const apolloResult = await queryApolloBuyers({ product, countryInfo, industry, role });
  providerTrace.push({
    provider: 'Apollo.io Search API',
    status: apolloResult.status,
    httpStatus: apolloResult.httpStatus || null,
    latencyMs: apolloResult.latencyMs || 0,
    records: apolloResult.records || 0,
    reason: apolloResult.reason || null,
  });

  if (apolloResult.buyers.length > 0) {
    buyers = apolloResult.buyers;
    primarySource = 'Apollo.io Search API';
    mode = 'apollo-live';
  } else {
    // 2. Automatic Live Open-Data Fallback: OpenCorporates + GLEIF + Clearbit (+ Hunter if key set)
    const [ocResult, gleifResult] = await Promise.all([
      queryOpenCorporates({
        keywords: commodityInfo.searchKeywords,
        countryInfo,
        product,
        industry,
        role,
      }),
      queryGleifBuyers({
        keywords: commodityInfo.searchKeywords,
        countryInfo,
        product,
        industry,
        role,
      }),
    ]);

    providerTrace.push({
      provider: 'OpenCorporates API',
      status: ocResult.status,
      httpStatus: ocResult.httpStatus || null,
      latencyMs: ocResult.latencyMs,
      records: ocResult.records || 0,
      reason: ocResult.reason || null,
    });

    if (ocResult.buyers.length > 0) {
      // Enrich OpenCorporates companies with Clearbit/Hunter when available
      const enrichedOc = await Promise.all(
        ocResult.buyers.slice(0, 15).map(async (b, idx) => {
          const clearbit = idx < 10 ? await enrichDomainViaClearbit(b.companyName) : null;
          const hunter = clearbit?.domain ? await enrichDomainViaHunter(clearbit.domain) : null;
          const domain = clearbit?.domain || null;
          return {
            ...b,
            buyerName: hunter?.buyerName || b.buyerName,
            role: hunter?.role || b.role,
            email: hunter?.email || (domain ? `procurement@${domain}` : null),
            emailStatus: hunter?.email ? hunter.emailStatus : domain ? 'Domain Inferred' : 'Registry Entity',
            website: clearbit?.website || null,
            domain,
            logo: clearbit?.logo || null,
            source: hunter ? 'OpenCorporates + Hunter.io' : 'OpenCorporates API',
          };
        })
      );
      buyers = enrichedOc;
      primarySource = config.hunterApiKey ? 'OpenCorporates + Hunter.io' : 'OpenCorporates API';
      mode = 'opencorporates-live';
    }

    providerTrace.push({
      provider: 'GLEIF Public Registry',
      status: gleifResult.status,
      httpStatus: gleifResult.httpStatus || null,
      latencyMs: gleifResult.latencyMs,
      records: gleifResult.records || 0,
      matchedDomains: gleifResult.matchedDomains || 0,
    });

    if (buyers.length === 0 && gleifResult.buyers.length > 0) {
      buyers = gleifResult.buyers;
      primarySource = config.hunterApiKey
        ? 'GLEIF Public Registry + Hunter.io'
        : 'GLEIF Public Registry';
      mode = 'open-data-live';
    }
  }

  const tradeContext = await comtradePromise;
  providerTrace.push({
    provider: 'UN Comtrade Public API',
    status: tradeContext.available ? 'ok' : 'unavailable',
    httpStatus: tradeContext.httpStatus || null,
    latencyMs: tradeContext.latencyMs || 0,
    records: tradeContext.partnerRecordsCount || 0,
    reason: tradeContext.error || null,
  });

  // Attach HS code & trade market context to each buyer row
  const normalizedBuyers = buyers.map((buyer) => ({
    ...buyer,
    hsCode: commodityInfo.cmdCode,
    commodityLabel: commodityInfo.label,
  }));

  const sourcesUsed = [
    primarySource,
    ...(tradeContext.available ? ['UN Comtrade Public API'] : []),
  ];

  return {
    query: {
      product: product || 'Textiles',
      country: countryInfo.name,
      countryIso2: countryInfo.iso2 || '',
      industry: industry || '',
      role: role || '',
      hsCode: commodityInfo.cmdCode,
      commodityLabel: commodityInfo.label,
    },
    meta: {
      sourceLabel: sourcesUsed.join(' + '),
      sourcesUsed,
      mode,
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      total: normalizedBuyers.length,
      providerTrace,
    },
    tradeContext,
    buyers: normalizedBuyers,
  };
}

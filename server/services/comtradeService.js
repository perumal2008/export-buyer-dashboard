import axios from 'axios';
import { getComtradeReferences } from '../utils/tradeMapping.js';

export async function fetchComtradeTradeContext({ countryInfo, commodityInfo }) {
  const startedAt = Date.now();
  const periods = ['2024', '2023', '2022'];
  const reporterCode = countryInfo.comtradeCode || 842;
  const cmdCode = commodityInfo.cmdCode || 'TOTAL';

  const { partners } = await getComtradeReferences();
  const partnerMap = new Map();
  for (const p of partners) {
    if (p.id != null) {
      partnerMap.set(Number(p.id), p.text || p.partnerDesc);
    }
  }

  for (const period of periods) {
    try {
      const url = 'https://comtradeapi.un.org/public/v1/preview/C/A/HS';
      const params = {
        reporterCode,
        period,
        cmdCode,
        flowCode: 'M',
      };

      const res = await axios.get(url, {
        params,
        timeout: 8000,
        headers: { 'User-Agent': 'TradePulseExportDashboard/1.0' },
      });

      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      if (rows.length === 0) {
        continue;
      }

      const worldRow = rows.find((r) => Number(r.partnerCode) === 0 && Number(r.partner2Code || 0) === 0) || rows[0];
      const partnerRows = rows
        .filter((r) => Number(r.partnerCode) > 0 && Number(r.partner2Code || 0) === 0 && Number(r.motCode || 0) === 0)
        .sort((a, b) => (Number(b.cifvalue || b.primaryValue || 0) - Number(a.cifvalue || a.primaryValue || 0)));

      const dedupedPartners = [];
      const seen = new Set();
      for (const row of partnerRows) {
        const pCode = Number(row.partnerCode);
        if (seen.has(pCode)) continue;
        seen.add(pCode);
        const valueUsd = Number(row.cifvalue || row.primaryValue || row.fobvalue || 0);
        if (valueUsd <= 0) continue;
        dedupedPartners.push({
          partnerCode: pCode,
          partnerName: partnerMap.get(pCode) || `Partner #${pCode}`,
          importValueUsd: valueUsd,
        });
        if (dedupedPartners.length >= 5) break;
      }

      const totalImportValueUsd = Number(
        worldRow?.cifvalue || worldRow?.primaryValue || worldRow?.fobvalue ||
        dedupedPartners.reduce((acc, p) => acc + p.importValueUsd, 0)
      );

      return {
        available: true,
        provider: 'UN Comtrade Public API',
        endpoint: `${url}?reporterCode=${reporterCode}&period=${period}&cmdCode=${cmdCode}&flowCode=M`,
        httpStatus: res.status,
        latencyMs: Date.now() - startedAt,
        period,
        reporterCode,
        reporterName: countryInfo.name,
        cmdCode,
        commodityLabel: commodityInfo.label,
        totalImportValueUsd,
        partnerRecordsCount: rows.length,
        topExportersToMarket: dedupedPartners,
      };
    } catch (err) {
      if (period === periods[periods.length - 1]) {
        return {
          available: false,
          provider: 'UN Comtrade Public API',
          httpStatus: err.response?.status || 0,
          latencyMs: Date.now() - startedAt,
          error: err.message,
          period,
          reporterCode,
          reporterName: countryInfo.name,
          cmdCode,
          commodityLabel: commodityInfo.label,
        };
      }
    }
  }

  return {
    available: false,
    provider: 'UN Comtrade Public API',
    latencyMs: Date.now() - startedAt,
    reporterCode,
    reporterName: countryInfo.name,
    cmdCode,
    commodityLabel: commodityInfo.label,
    error: 'No recent annual import rows returned for this HS code',
  };
}

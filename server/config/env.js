import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  apolloApiKey: (process.env.APOLLO_API_KEY || '').trim(),
  hunterApiKey: (process.env.HUNTER_API_KEY || '').trim(),
  openCorporatesApiKey: (process.env.OPENCORPORATES_API_KEY || '').trim(),
  smtp: {
    host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || '').trim(),
    fromName: (process.env.SMTP_FROM_NAME || 'GlobalTrade Export Desk').trim(),
    fromEmail: (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'outreach@globaltrade-export.local').trim(),
  },
};

export function getIntegrationStatus() {
  const hasApollo = Boolean(config.apolloApiKey);
  const hasHunter = Boolean(config.hunterApiKey);
  const hasOpenCorporates = Boolean(config.openCorporatesApiKey);
  const hasSmtp = Boolean(config.smtp.user && config.smtp.pass);

  let activeBuyerMode = 'Live Open-Data Fallback (GLEIF + UN Comtrade)';
  if (hasApollo && hasHunter) {
    activeBuyerMode = 'Apollo.io + Hunter.io Live API';
  } else if (hasApollo) {
    activeBuyerMode = 'Apollo.io Live Search API';
  } else if (hasHunter) {
    activeBuyerMode = 'Hunter.io + Open-Data Live API';
  } else if (hasOpenCorporates) {
    activeBuyerMode = 'OpenCorporates + UN Comtrade Live API';
  }

  return {
    buyerDiscovery: {
      mode: activeBuyerMode,
      apolloConfigured: hasApollo,
      hunterConfigured: hasHunter,
      openCorporatesConfigured: hasOpenCorporates,
      openDataFallbackActive: !hasApollo,
      liveProviders: [
        ...(hasApollo ? ['Apollo.io Search'] : []),
        ...(hasHunter ? ['Hunter.io Domain Search'] : []),
        ...(hasOpenCorporates ? ['OpenCorporates'] : []),
        ...(!hasApollo ? ['GLEIF Public Registry', 'Clearbit Suggest', 'UN Comtrade'] : ['UN Comtrade']),
      ],
    },
    email: {
      mode: hasSmtp ? 'smtp-live' : 'preview-simulated',
      smtpConfigured: hasSmtp,
      smtpHost: hasSmtp ? config.smtp.host : null,
      smtpUser: hasSmtp ? config.smtp.user : null,
      fromAddress: `${config.smtp.fromName} <${config.smtp.fromEmail}>`,
    },
    checkedAt: new Date().toISOString(),
  };
}

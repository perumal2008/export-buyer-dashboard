import express from 'express';
import cors from 'cors';
import { config, getIntegrationStatus } from './config/env.js';
import buyersRouter from './routes/buyers.js';
import leadsRouter from './routes/leads.js';
import campaignsRouter from './routes/campaigns.js';
import analyticsRouter from './routes/analytics.js';

const app = express();

app.use(
  cors({
    origin: [config.clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'export-buyer-discovery-api',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/status', (_req, res) => {
  res.json(getIntegrationStatus());
});

app.use('/api/buyers', buyersRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/analytics', analyticsRouter);

app.listen(config.port, () => {
  const status = getIntegrationStatus();
  console.log(`Export Buyer Discovery API listening on http://localhost:${config.port}`);
  console.log(`Buyer Discovery Mode: ${status.buyerDiscovery.mode}`);
  console.log(`Email Transport Mode: ${status.email.mode}`);
});

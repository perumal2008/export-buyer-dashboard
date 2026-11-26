import { Router } from 'express';
import { discoverBuyers } from '../services/buyerDiscoveryService.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const {
      product = 'Textiles',
      country = 'United States',
      industry = '',
      role = 'Importer',
    } = req.query;

    const result = await discoverBuyers({
      product: String(product),
      country: String(country),
      industry: String(industry),
      role: String(role),
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to query live buyer discovery APIs',
      message: err.message,
    });
  }
});

export default router;

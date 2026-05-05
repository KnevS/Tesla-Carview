import { Router } from 'express';
import { getAuthUrl, exchangeCode, getAccessToken } from '../services/teslaApi.js';

const router = Router();

router.get('/login', (_req, res) => {
  res.redirect(getAuthUrl());
});

router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return res.redirect(`${process.env.FRONTEND_URL}/?auth_error=${error || 'no_code'}`);
  }
  try {
    await exchangeCode(code);
    res.redirect(`${process.env.FRONTEND_URL}/?auth_success=1`);
  } catch (err) {
    console.error('Auth Fehler:', err.message);
    res.redirect(`${process.env.FRONTEND_URL}/?auth_error=exchange_failed`);
  }
});

router.get('/status', async (_req, res) => {
  try {
    await getAccessToken();
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

export default router;

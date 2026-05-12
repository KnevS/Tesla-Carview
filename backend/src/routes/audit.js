/**
 * Admin-Audit-Log-Viewer.
 *
 * Greift auf die per Tenant befuellte audit_logs-Tabelle zu, paginiert,
 * filterbar nach action / user / Zeitraum, plus CSV-Export. Kein Schreib-
 * Endpunkt — Logs werden ueber auditService.auditLog() befuellt.
 */
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);

const querySchema = z.object({
  action:  z.string().min(1).max(64).optional(),
  user_id: z.coerce.number().int().positive().optional(),
  from:    z.coerce.number().int().nonnegative().optional(),
  to:      z.coerce.number().int().nonnegative().optional(),
  limit:   z.coerce.number().int().min(1).max(500).default(100),
  offset:  z.coerce.number().int().min(0).default(0),
  // Sortierreihenfolge nach created_at. desc = neueste zuerst (Default).
  sort:    z.enum(['asc', 'desc']).default('desc'),
});

/** Wandelt die geparsten Filter in WHERE-SQL + Parameter um. Wird von
 *  GET / und GET /export geteilt, damit sich Filter und Export
 *  garantiert identisch verhalten. */
function buildWhere(parsed) {
  const conds = [];
  const params = [];
  if (parsed.action)  { conds.push('a.action = ?');     params.push(parsed.action); }
  if (parsed.user_id) { conds.push('a.user_id = ?');    params.push(parsed.user_id); }
  if (parsed.from)    { conds.push('a.created_at >= ?'); params.push(parsed.from); }
  if (parsed.to)      { conds.push('a.created_at <= ?'); params.push(parsed.to); }
  return {
    where: conds.length ? 'WHERE ' + conds.join(' AND ') : '',
    params,
  };
}

// GET /api/audit — paginierte Liste mit Filter.
router.get('/', (req, res) => {
  const parse = querySchema.safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0]?.message });
  const { where, params } = buildWhere(parse.data);
  const orderDir = parse.data.sort === 'asc' ? 'ASC' : 'DESC';
  const rows = req.db.prepare(
    `SELECT a.id, a.user_id, a.action, a.ip_address, a.user_agent, a.details, a.created_at,
            u.username
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at ${orderDir}
       LIMIT ? OFFSET ?`
  ).all(...params, parse.data.limit, parse.data.offset);

  // Total fuer Pagination — auf gefiltertem Set, nicht auf der Tabelle.
  const total = req.db.prepare(
    `SELECT COUNT(*) AS n FROM audit_logs a ${where}`
  ).get(...params).n;

  res.json({ rows, total, limit: parse.data.limit, offset: parse.data.offset });
});

// GET /api/audit/actions — verfuegbare action-Werte fuer das Filter-Dropdown.
router.get('/actions', (req, res) => {
  const rows = req.db.prepare(
    'SELECT action, COUNT(*) AS count FROM audit_logs GROUP BY action ORDER BY action'
  ).all();
  res.json(rows);
});

// GET /api/audit/export.csv — gleicher Filter-Set, gibt CSV mit allen
// Feldern zurueck (kein Limit). Timestamp als ISO-8601 fuer Excel-Import.
router.get('/export.csv', (req, res) => {
  const parse = querySchema.partial().safeParse(req.query);
  if (!parse.success) return res.status(400).json({ error: parse.error.errors[0]?.message });
  const { where, params } = buildWhere({ ...parse.data, limit: 999_999, offset: 0 });

  const rows = req.db.prepare(
    `SELECT a.id, a.user_id, u.username, a.action, a.ip_address, a.user_agent,
            a.details, a.created_at
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC`
  ).all(...params);

  const header = ['id', 'created_at_iso', 'user_id', 'username', 'action',
                  'ip_address', 'user_agent', 'details'];
  const csvLine = arr => arr.map(c => {
    const v = c == null ? '' : String(c).replace(/"/g, '""');
    return /[",;\n]/.test(v) ? `"${v}"` : v;
  }).join(';');

  const lines = [csvLine(header)];
  for (const r of rows) {
    lines.push(csvLine([
      r.id,
      new Date(r.created_at * 1000).toISOString(),
      r.user_id ?? '',
      r.username ?? '',
      r.action,
      r.ip_address ?? '',
      r.user_agent ?? '',
      r.details ?? '',
    ]));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition',
    `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`);
  // BOM fuer Excel-Auto-UTF8-Erkennung.
  res.send('﻿' + lines.join('\n'));
});

export default router;

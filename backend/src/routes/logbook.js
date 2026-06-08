// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import { auditLog } from '../services/auditService.js';

const router = Router();

const CATEGORIES = ['note', 'maintenance', 'repair', 'tire', 'inspection', 'accident', 'other'];

// Felder, die wir im Audit-Diff vergleichen — alles was der Nutzer im UI editiert.
const AUDIT_FIELDS = ['title', 'description', 'category', 'mileage_km', 'cost', 'currency', 'entry_date'];

function diffEntry(before, after) {
  const out = {};
  for (const f of AUDIT_FIELDS) {
    if ((before[f] ?? null) !== (after[f] ?? null)) {
      out[f] = { before: before[f] ?? null, after: after[f] ?? null };
    }
  }
  return out;
}

router.get('/', (req, res) => {
  const db = req.db;
  const { vehicle_id, category, limit = 50, offset = 0, sort } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (vehicle_id) { conditions.push('le.vehicle_id = ?'); params.push(vehicle_id); }
    if (category)   { conditions.push('le.category = ?');   params.push(category); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    // Sortierreihenfolge: desc (Default, neueste zuerst) oder asc.
    const orderDir = sort === 'asc' ? 'ASC' : 'DESC';
    // LEFT JOIN users → Username des Erstellers fuer die Anzeige.
    // Bleibt NULL fuer historische Eintraege ohne created_by_user_id.
    const entries = db.prepare(
      `SELECT le.*, u.username AS created_by_username
         FROM logbook_entries le
         LEFT JOIN users u ON u.id = le.created_by_user_id
         ${where} ORDER BY le.entry_date ${orderDir} LIMIT ? OFFSET ?`
    ).all(...params, +limit, +offset);
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  const db = req.db;
  const { vehicle_id, entry_date, category = 'note', title, description, mileage_km, cost, currency } = req.body;
  if (!vehicle_id || !title) return res.status(400).json({ error: 'vehicle_id und title sind Pflichtfelder' });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Ungültige Kategorie' });
  try {
    // created_by_user_id aus dem JWT (req.user.sub gemaess App-Konvention).
    // Auch wenn der Endpoint wegen requireAuth nie ohne User aufgerufen wird,
    // schreiben wir defensiv null statt undefined falls der Typ kippt.
    const createdBy = req.user?.sub ?? null;
    const result = db.prepare(
      `INSERT INTO logbook_entries
         (vehicle_id, entry_date, category, title, description,
          mileage_km, cost, currency, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      vehicle_id, entry_date || Math.floor(Date.now() / 1000),
      category, title, description, mileage_km, cost,
      currency || 'EUR', createdBy,
    );
    const id = result.lastInsertRowid;
    auditLog(db, createdBy, 'logbook.create', req,
      { id, vehicle_id, title, category, entry_date, cost });
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const db = req.db;
  const id = Number(req.params.id);
  const { title, description, category, mileage_km, cost, entry_date } = req.body;
  if (!title) return res.status(400).json({ error: 'title ist Pflichtfeld' });
  if (category && !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Ungültige Kategorie' });
  try {
    // Vorzustand fuer Audit-Diff laden — wenn der Eintrag nicht existiert,
    // antworten wir 404 statt stillschweigend zu mutieren.
    const before = db.prepare('SELECT * FROM logbook_entries WHERE id=?').get(id);
    if (!before) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

    // Ersteller bleibt unveraendert — Edits aktualisieren nur updated_at.
    db.prepare(
      `UPDATE logbook_entries SET title=?, description=?, category=?, mileage_km=?, cost=?,
       entry_date=?, updated_at=unixepoch() WHERE id=?`
    ).run(title, description ?? null, category, mileage_km ?? null, cost ?? null, entry_date, id);

    const after = db.prepare(`
      SELECT le.*, u.username AS created_by_username
        FROM logbook_entries le
        LEFT JOIN users u ON u.id = le.created_by_user_id
       WHERE le.id=?`).get(id);

    const changes = diffEntry(before, after);
    // Nur loggen wenn sich wirklich etwas geaendert hat — sonst spammt das
    // Audit-Log bei jedem versehentlichen Speichern desselben Forms.
    if (Object.keys(changes).length) {
      auditLog(db, req.user?.sub ?? null, 'logbook.update', req,
        { id, vehicle_id: before.vehicle_id, changes });
    }
    res.json(after);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = req.db;
  const id = Number(req.params.id);
  try {
    // Snapshot vor dem Loeschen fuer das Audit — damit ein Restore (manuell
    // aus dem Log) ueberhaupt moeglich ist.
    const before = db.prepare('SELECT * FROM logbook_entries WHERE id=?').get(id);
    if (!before) return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    db.prepare('DELETE FROM logbook_entries WHERE id = ?').run(id);
    auditLog(db, req.user?.sub ?? null, 'logbook.delete', req,
      { id, vehicle_id: before.vehicle_id, snapshot: {
        title: before.title, category: before.category, entry_date: before.entry_date,
        mileage_km: before.mileage_km, cost: before.cost, description: before.description,
      } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

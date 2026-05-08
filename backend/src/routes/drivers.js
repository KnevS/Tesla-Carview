import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  const drivers = req.db.prepare('SELECT * FROM drivers ORDER BY is_default DESC, name ASC').all();
  res.json(drivers);
});

router.post('/', (req, res) => {
  const { name, color = '#6b7280', is_default = 0 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name erforderlich' });
  const db = req.db;
  if (+is_default) db.prepare('UPDATE drivers SET is_default=0').run();
  const result = db.prepare(
    'INSERT INTO drivers (name, color, is_default) VALUES (?, ?, ?)'
  ).run(name.trim(), color, is_default ? 1 : 0);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.patch('/:id', (req, res) => {
  const db = req.db;
  const driver = db.prepare('SELECT * FROM drivers WHERE id=?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Fahrer nicht gefunden' });
  const { name, color, is_default } = req.body;
  if (is_default) db.prepare('UPDATE drivers SET is_default=0').run();
  db.prepare('UPDATE drivers SET name=?, color=?, is_default=? WHERE id=?').run(
    name     ?? driver.name,
    color    ?? driver.color,
    is_default !== undefined ? (is_default ? 1 : 0) : driver.is_default,
    req.params.id
  );
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = req.db;
  db.prepare('UPDATE trips SET driver_id=NULL WHERE driver_id=?').run(req.params.id);
  db.prepare('DELETE FROM drivers WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import { Router } from 'express';
import PDFDocument from 'pdfkit';

const router = Router();

// CSV-Export Fahrten
router.get('/trips.csv', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
  const rows = db.prepare(
    `SELECT t.*, v.display_name FROM trips t JOIN vehicles v ON v.id=t.vehicle_id ${where} ORDER BY start_time DESC`
  ).all(...(vehicle_id ? [vehicle_id] : []));

  const headers = ['id','start_time','end_time','start_address','end_address','distance_km',
    'energy_used_kwh','avg_speed_kmh','max_speed_kmh','start_soc','end_soc','vehicle'];
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => {
      const v = h === 'vehicle' ? r.display_name : r[h];
      return v != null ? String(v).replace(/;/g, ',') : '';
    }).join(';')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fahrten.csv"');
  res.send('﻿' + csv); // BOM für Excel
});

// JSON-Export Fahrten
router.get('/trips.json', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE t.vehicle_id = ?' : '';
  const trips = db.prepare(
    `SELECT t.*, v.display_name FROM trips t JOIN vehicles v ON v.id=t.vehicle_id ${where} ORDER BY start_time DESC`
  ).all(...(vehicle_id ? [vehicle_id] : []));

  const withPoints = trips.map(t => ({
    ...t,
    points: db.prepare('SELECT * FROM trip_points WHERE trip_id=? ORDER BY timestamp ASC').all(t.id),
  }));
  res.json(withPoints);
});

// CSV-Export Ladevorgänge
router.get('/charging.csv', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE vehicle_id = ?' : '';
  const rows = db.prepare(
    `SELECT * FROM charging_sessions ${where} ORDER BY start_time DESC`
  ).all(...(vehicle_id ? [vehicle_id] : []));

  const headers = ['id','start_time','end_time','location_name','charger_type',
    'start_soc','end_soc','energy_added_kwh','max_power_kw','cost','currency'];
  const csv = [
    headers.join(';'),
    ...rows.map(r => headers.map(h => r[h] != null ? String(r[h]).replace(/;/g, ',') : '').join(';')),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="ladevorgaenge.csv"');
  res.send('﻿' + csv);
});

// Vollständiges Backup als JSON
router.get('/backup.json', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE id = ?' : '';
  const vehicles = db.prepare(`SELECT * FROM vehicles ${where}`).all(...(vehicle_id ? [vehicle_id] : []));

  const backup = vehicles.map(v => ({
    vehicle: v,
    trips: db.prepare('SELECT * FROM trips WHERE vehicle_id=?').all(v.id),
    charging: db.prepare('SELECT * FROM charging_sessions WHERE vehicle_id=?').all(v.id),
    battery: db.prepare('SELECT * FROM battery_snapshots WHERE vehicle_id=?').all(v.id),
    logbook: db.prepare('SELECT * FROM logbook_entries WHERE vehicle_id=?').all(v.id),
  }));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tesla-carview-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json({ exportedAt: new Date().toISOString(), data: backup });
});

// PDF-Export Fahrten
router.get('/trips.pdf', (req, res) => {
  const db = req.db;
  const { vehicle_id } = req.query;
  const where = vehicle_id ? 'WHERE t.vehicle_id = ?' : '';
  const rows = db.prepare(
    `SELECT t.start_time, t.end_time, t.start_address, t.end_address,
            t.distance_km, t.energy_used_kwh, t.start_soc, t.end_soc,
            v.display_name
     FROM trips t JOIN vehicles v ON v.id=t.vehicle_id ${where}
     ORDER BY t.start_time DESC LIMIT 500`
  ).all(...(vehicle_id ? [vehicle_id] : []));

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="fahrten-${new Date().toISOString().slice(0,10)}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('Tesla Carview — Fahrtenbuch', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Exportiert: ${new Date().toLocaleDateString('de-DE')}`, { align: 'center' });
  doc.moveDown(1.5);

  // Spaltenbreiten
  const cols = [55, 90, 140, 140, 55, 50, 40, 40];
  const headers = ['Datum', 'Start', 'Von', 'Nach', 'km', 'kWh', 'SoC\nStart', 'SoC\nEnd'];
  const startX = 40;
  let y = doc.y;

  // Tabellenkopf
  doc.font('Helvetica-Bold').fontSize(8);
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 2, y + 2, { width: cols[i] - 4, align: i < 3 ? 'left' : 'right' });
    x += cols[i];
  });
  doc.rect(startX, y, cols.reduce((a,b)=>a+b,0), 22).stroke();
  y += 22;

  // Zeilen
  doc.font('Helvetica').fontSize(7.5);
  rows.forEach((r, idx) => {
    if (y > 760) { doc.addPage(); y = 40; }
    const bg = idx % 2 === 0 ? '#f8f8f8' : '#ffffff';
    doc.rect(startX, y, cols.reduce((a,b)=>a+b,0), 18).fill(bg).stroke('#dddddd');
    doc.fill('#000000');
    const cells = [
      new Date(r.start_time * 1000).toLocaleDateString('de-DE'),
      r.display_name || '',
      (r.start_address || '').substring(0, 22),
      (r.end_address || '').substring(0, 22),
      r.distance_km != null ? r.distance_km.toFixed(1) : '',
      r.energy_used_kwh != null ? r.energy_used_kwh.toFixed(1) : '',
      r.start_soc != null ? `${r.start_soc}%` : '',
      r.end_soc != null ? `${r.end_soc}%` : '',
    ];
    x = startX;
    cells.forEach((cell, i) => {
      doc.text(cell, x + 2, y + 4, { width: cols[i] - 4, align: i < 3 ? 'left' : 'right', lineBreak: false });
      x += cols[i];
    });
    y += 18;
  });

  // Zusammenfassung
  doc.moveDown(1);
  const totalKm  = rows.reduce((s, r) => s + (r.distance_km || 0), 0);
  const totalKwh = rows.reduce((s, r) => s + (r.energy_used_kwh || 0), 0);
  doc.font('Helvetica-Bold').fontSize(9)
    .text(`Gesamt: ${rows.length} Fahrten · ${totalKm.toFixed(1)} km · ${totalKwh.toFixed(1)} kWh`);

  doc.end();
});

export default router;

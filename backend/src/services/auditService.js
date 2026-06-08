// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
export function auditLog(db, userId, action, req, details = null) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      userId ?? null,
      action,
      req?.ip ?? null,
      req?.headers?.['user-agent']?.slice(0, 255) ?? null,
      details ? JSON.stringify(details) : null,
    );
  } catch { /* darf App nicht blockieren */ }
}

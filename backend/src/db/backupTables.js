/** Tabellen, die in einen vollstaendigen Tenant-Backup kommen.
 *  Wird von data-management.js (HTTP-Export) und autoBackupService.js
 *  (Scheduler) gemeinsam genutzt. */
export const BACKUP_TABLES = [
  'users', 'drivers', 'vehicles',
  'trips', 'trip_points',
  'charging_locations', 'charging_sessions', 'charging_points',
  'battery_snapshots', 'logbook_entries', 'telemetry_points',
  'vehicle_state_cache', 'vehicle_users',
  'passkey_credentials',
  'mfa_backup_codes', 'audit_logs',
  'tokens', 'tenant_settings', 'virtual_key',
  'user_invites', 'legal_acceptance',
  'service_intervals', 'service_records', 'trip_changes',
  'billing_periods', 'tesla_api_usage', 'tesla_usage_events',
];

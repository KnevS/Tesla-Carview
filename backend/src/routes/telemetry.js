import { Router } from 'express';
import { getVehicleData } from '../services/teslaApi.js';
import { getDb } from '../db/database.js';

const router = Router();

router.get('/:vehicleId/live', async (req, res) => {
  const db = getDb();
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Fahrzeug nicht gefunden' });

  try {
    const data = await getVehicleData(vehicle.tesla_id);
    const resp = data.response ?? data;
    const { drive_state: d, charge_state: c, vehicle_state: vs, climate_state: cl } = resp;

    res.json({
      state: resp.state,
      drive: {
        speed_kph:  d?.speed != null ? +(d.speed * 1.60934).toFixed(1) : null,
        power_kw:   d?.power ?? null,
        heading:    d?.heading ?? null,
        lat:        d?.latitude ?? null,
        lon:        d?.longitude ?? null,
        gear:       d?.shift_state ?? null,
      },
      charge: {
        level_pct:           c?.battery_level ?? null,
        range_km:            c?.battery_range  != null ? +(c.battery_range * 1.60934).toFixed(1) : null,
        charging_state:      c?.charging_state ?? null,
        charge_rate_kph:     c?.charge_rate    != null ? +(c.charge_rate   * 1.60934).toFixed(1) : null,
        charger_power_kw:    c?.charger_power  ?? null,
        time_to_full_charge_h: c?.time_to_full_charge ?? null,
        charge_limit_pct:    c?.charge_limit_soc ?? null,
      },
      climate: {
        inside_temp_c:         cl?.inside_temp         ?? null,
        outside_temp_c:        cl?.outside_temp         ?? null,
        driver_temp_setting:   cl?.driver_temp_setting  ?? null,
        is_climate_on:         cl?.is_climate_on        ?? null,
        fan_status:            cl?.fan_status           ?? null,
        is_front_defroster_on: cl?.is_front_defroster_on ?? null,
        is_rear_defroster_on:  cl?.is_rear_defroster_on  ?? null,
      },
      vehicle: {
        odometer_km:      vs?.odometer != null ? +(vs.odometer * 1.60934).toFixed(1) : null,
        locked:           vs?.locked       ?? null,
        sentry_mode:      vs?.sentry_mode  ?? null,
        software_version: vs?.car_version  ?? null,
        tpms: {
          fl: vs?.tpms_pressure_fl != null ? +(vs.tpms_pressure_fl * 6.89476).toFixed(2) : null,
          fr: vs?.tpms_pressure_fr != null ? +(vs.tpms_pressure_fr * 6.89476).toFixed(2) : null,
          rl: vs?.tpms_pressure_rl != null ? +(vs.tpms_pressure_rl * 6.89476).toFixed(2) : null,
          rr: vs?.tpms_pressure_rr != null ? +(vs.tpms_pressure_rr * 6.89476).toFixed(2) : null,
        },
      },
      ts: Math.floor(Date.now() / 1000),
    });
  } catch (e) {
    if (e.response?.status === 408 || e.message?.includes('offline') || e.message?.includes('asleep')) {
      return res.status(503).json({ error: 'Fahrzeug schläft oder ist offline' });
    }
    console.error('[telemetry] error:', e.message);
    res.status(502).json({ error: 'Fehler beim Abrufen der Fahrzeugdaten' });
  }
});

export default router;

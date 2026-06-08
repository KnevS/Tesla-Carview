<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="flex items-center gap-2 flex-wrap">
    <select v-model.number="year" class="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600">
      <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
    </select>
    <button @click="generate" :disabled="busy" class="btn-primary text-sm">
      {{ busy ? '…' : $t('trips.annualReportGenerate') }}
    </button>
    <p v-if="msg" :class="ok ? 'text-green-400' : 'text-red-400'" class="text-xs">{{ msg }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import api from '../api.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const appStore = useAppStore();
const { t }    = useI18n();
const year     = ref(new Date().getFullYear());
const busy     = ref(false);
const msg      = ref('');
const ok       = ref(false);

const years = computed(() => {
  const now = new Date().getFullYear();
  return [now, now - 1, now - 2, now - 3];
});

async function generate() {
  busy.value = true;
  msg.value  = '';
  try {
    const { data } = await api.get('/trips/annual-report', {
      params: { year: year.value, vehicle_id: appStore.selectedVehicle?.id },
    });
    if (!data.totals?.trips) {
      ok.value = false;
      msg.value = t('annualReport.noTrips');
      return;
    }
    renderPdf(data);
    ok.value = true;
    msg.value = '✓';
    setTimeout(() => { msg.value = ''; }, 1500);
  } catch (err) {
    ok.value = false;
    msg.value = t('annualReport.loadFailed') + ': ' + (err.response?.data?.error || err.message);
  } finally { busy.value = false; }
}

/** Komplett clientseitiges PDF-Rendering mit jsPDF. Kein Server-PDF —
 *  Daten kommen als JSON, Layout entscheidet der Client. Dadurch kann
 *  der Operator das Branding spaeter leicht anpassen (Logo, Farben),
 *  ohne den Backend-Code zu aendern. */
function renderPdf(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 15;
  const w = doc.internal.pageSize.getWidth();
  let y = M;

  // Header
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(t('annualReport.title'), M, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`${t('annualReport.year')}: ${data.year}`, M, y);
  if (appStore.selectedVehicle) {
    doc.text(`${t('annualReport.vehicle')}: ${appStore.selectedVehicle.display_name}`, M + 60, y);
  }
  y += 10;

  // Totals-Box
  doc.setFillColor(248, 250, 252);
  doc.rect(M, y, w - 2 * M, 30, 'F');
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text(t('annualReport.totals'), M + 3, y + 6);
  doc.setFont(undefined, 'normal');
  const km = Math.round(data.totals.km);
  const consumption = data.totals.km
    ? (data.totals.kwh / data.totals.km * 100).toFixed(1)
    : '—';
  const colW = (w - 2 * M) / 4;
  doc.text(`${t('annualReport.trips')}: ${data.totals.trips}`,                       M + 3,              y + 14);
  doc.text(`${t('annualReport.totalKm')}: ${km.toLocaleString()} km`,                M + 3 + colW,       y + 14);
  doc.text(`${t('annualReport.consumption')}: ${consumption} kWh/100km`,             M + 3 + 2 * colW,   y + 14);
  doc.text(`kWh: ${Math.round(data.totals.kwh)}`,                                    M + 3 + 3 * colW,   y + 14);

  doc.text(`${t('annualReport.private')}: ${Math.round(data.totals.km_private)} km`,    M + 3,            y + 22);
  doc.text(`${t('annualReport.business')}: ${Math.round(data.totals.km_business)} km`,  M + 3 + colW,     y + 22);
  doc.text(`${t('annualReport.commute')}: ${Math.round(data.totals.km_commute)} km`,    M + 3 + 2 * colW, y + 22);
  y += 36;

  // Top routes table
  if (data.topRoutes?.length) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(t('annualReport.topRoutes'), M, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      head: [[t('annualReport.trips'), t('annualReport.totalKm'), 'Route']],
      body: data.topRoutes.map(r => [r.trips, Math.round(r.km), r.route]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [148, 163, 184] },
      theme: 'striped',
      margin: { left: M, right: M },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Charging
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(t('annualReport.charging'), M, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`${t('annualReport.chargingTotal')}: ${Math.round(data.charging?.kwh || 0)} kWh`, M, y);
  doc.text(`${t('annualReport.chargingCost')}: ${(data.charging?.cost || 0).toFixed(2)} €`, M + 80, y);
  y += 10;

  // CO2
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(t('annualReport.co2'), M, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`${t('annualReport.co2Tesla')}: ${data.co2.tesla_kg} kg`, M, y);
  y += 5;
  doc.text(`${t('annualReport.co2Diesel')}: ${data.co2.diesel_kg} kg`, M, y);
  y += 5;
  doc.setTextColor(34, 197, 94);
  doc.setFont(undefined, 'bold');
  doc.text(`${t('annualReport.co2Saved')}: ${data.co2.saved_kg} kg CO₂`, M, y);
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(t('annualReport.footer'), M, ph - 10);
  doc.text(new Date().toLocaleDateString(), w - M, ph - 10, { align: 'right' });

  doc.save(`tesla-carview-${data.year}.pdf`);
}
</script>

<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">{{ $t('tco.title') }}</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ $t('tco.subtitle') }}</p>
      </div>
      <p v-if="data?.vehicle?.display_name" class="text-sm text-gray-400 self-center">
        🚗 {{ data.vehicle.display_name }}
      </p>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">{{ $t('common.loading') }} …</div>
    <div v-else-if="error" class="bg-red-900/30 border border-red-700/40 rounded-xl p-4 text-sm text-red-200">{{ error }}</div>

    <template v-else-if="data">
      <!-- Hinweisbanner falls Stammdaten unvollständig -->
      <div v-if="!hasMinimalData"
           class="flex items-start gap-3 bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-3 text-sm text-amber-100">
        <span class="text-lg leading-none mt-0.5">💡</span>
        <div class="flex-1">
          <p class="font-semibold">{{ $t('tco.incompleteTitle') }}</p>
          <p class="mt-1 text-amber-200/90">{{ $t('tco.incompleteHint') }}</p>
          <button @click="jumpToBaseForm"
                  class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-200 hover:text-amber-50 underline underline-offset-2">
            ✎ {{ $t('tco.jumpToBase') }} →
          </button>
        </div>
      </div>

      <!-- KPI-Karten -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="card p-4">
          <p class="text-xs text-gray-400">{{ $t('tco.kpi.costPerKm') }}</p>
          <p class="text-2xl font-bold mt-1">
            {{ data.summary.cost_per_km_eur != null ? fmtEur(data.summary.cost_per_km_eur, 3) : '—' }}
            <span v-if="data.summary.cost_per_km_eur != null" class="text-xs text-gray-400 font-normal">/km</span>
          </p>
          <p class="text-[11px] text-gray-500 mt-1">{{ $t('tco.kpi.basis', { km: fmtKm(data.summary.driven_km) }) }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-400">{{ $t('tco.kpi.total') }}</p>
          <p class="text-2xl font-bold mt-1">{{ fmtEurOrDash(data.summary.total_eur) }}</p>
          <p v-if="data.summary.years_owned != null" class="text-[11px] text-gray-500 mt-1">
            {{ $t('tco.kpi.yearsOwned', { years: data.summary.years_owned.toFixed(1) }) }}
          </p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-400">{{ $t('tco.kpi.depreciation') }}</p>
          <p class="text-2xl font-bold mt-1">{{ fmtEurOrDash(data.summary.depreciation_eur) }}</p>
          <p v-if="data.summary.residual_eur != null" class="text-[11px] text-gray-500 mt-1">
            {{ $t('tco.kpi.residual') }}: {{ fmtEur(data.summary.residual_eur) }}
            <span v-if="data.summary.residual_is_estimate" :title="$t('tco.residualEstimateHint')" class="cursor-help">·*</span>
          </p>
        </div>
        <div class="card p-4">
          <p class="text-xs text-gray-400">{{ $t('tco.kpi.electricity') }}</p>
          <p class="text-2xl font-bold mt-1">{{ fmtEur(data.summary.electricity_eur || 0) }}</p>
          <p class="text-[11px] text-gray-500 mt-1">{{ $t('tco.kpi.fromCharging') }}</p>
        </div>
      </div>

      <!-- Aufschlüsselung -->
      <div class="card p-5">
        <h2 class="text-base font-semibold mb-3">{{ $t('tco.breakdown.title') }}</h2>
        <table class="w-full text-sm">
          <tbody class="divide-y divide-gray-700">
            <tr v-for="row in breakdownRows" :key="row.key" class="hover:bg-gray-800/40">
              <td class="py-2">
                <span class="mr-2">{{ row.icon }}</span>
                {{ $t('tco.breakdown.' + row.key) }}
                <span v-if="row.tooltip" :title="row.tooltip" class="text-gray-500 ml-1 cursor-help">ⓘ</span>
              </td>
              <td class="py-2 text-right tabular-nums">
                <span v-if="row.value == null" class="text-gray-500 italic">{{ $t('tco.breakdown.notSet') }}</span>
                <template v-else>{{ fmtEur(row.value) }}</template>
              </td>
              <td class="py-2 text-right text-xs text-gray-500 tabular-nums w-20">
                <template v-if="row.value != null && data.summary.total_eur">
                  {{ ((row.value / data.summary.total_eur) * 100).toFixed(0) }} %
                </template>
              </td>
            </tr>
            <tr v-if="data.summary.total_eur != null" class="font-semibold border-t-2 border-gray-600">
              <td class="py-3">{{ $t('tco.breakdown.totalRow') }}</td>
              <td class="py-3 text-right tabular-nums">{{ fmtEur(data.summary.total_eur) }}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 12-Monats-Kostenausblick -->
      <div v-if="forecast && forecast.has_history" class="card p-5">
        <h2 class="text-base font-semibold">{{ $t('tco.forecast.title') }}</h2>
        <p class="text-gray-400 text-xs mt-0.5 mb-3">{{ $t('tco.forecast.subtitle') }}</p>
        <table class="w-full text-sm">
          <tbody class="divide-y divide-gray-700">
            <tr v-for="row in forecastRows" :key="row.key">
              <td class="py-2"><span class="mr-2">{{ row.icon }}</span>{{ $t('tco.forecast.' + row.key) }}</td>
              <td class="py-2 text-right tabular-nums">
                <span v-if="row.value == null" class="text-gray-500 italic">{{ $t('tco.breakdown.notSet') }}</span>
                <template v-else>{{ fmtEur(row.value) }}</template>
              </td>
            </tr>
            <tr class="font-semibold border-t-2 border-gray-600">
              <td class="py-3">{{ $t('tco.forecast.total') }}</td>
              <td class="py-3 text-right tabular-nums">{{ fmtEur(forecast.predicted.total_eur) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Service-Records mit Hinzufügen -->
      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">{{ $t('tco.records.title') }}</h2>
          <button v-if="canEdit" @click="openRecordForm()" class="btn-primary text-sm">
            + {{ $t('tco.records.add') }}
          </button>
        </div>

        <div v-if="recordForm" class="bg-gray-800/60 border border-gray-700 rounded-lg p-4 space-y-3 mb-4">
          <div class="grid grid-cols-2 gap-3">
            <label class="block text-xs">
              <span class="text-gray-400">{{ $t('tco.records.date') }}</span>
              <input type="date" v-model="recordForm.dateStr" required class="mt-1 input w-full" />
            </label>
            <label class="block text-xs">
              <span class="text-gray-400">{{ $t('tco.records.odometer') }}</span>
              <input type="number" step="1" v-model="recordForm.odometer_km" class="mt-1 input w-full"
                     :placeholder="data.vehicle.odometer_km ? Math.round(data.vehicle.odometer_km).toString() : ''" />
            </label>
            <label class="block text-xs">
              <span class="text-gray-400">{{ $t('tco.records.category') }}</span>
              <select v-model="recordForm.category" class="mt-1 input w-full">
                <option v-for="c in CATEGORIES" :key="c" :value="c">{{ $t('tco.categories.' + c) }}</option>
              </select>
            </label>
            <label class="block text-xs">
              <span class="text-gray-400">{{ $t('tco.records.cost') }} (EUR)</span>
              <input type="number" step="0.01" v-model="recordForm.cost_eur" required class="mt-1 input w-full" />
            </label>
          </div>
          <label class="block text-xs">
            <span class="text-gray-400">{{ $t('tco.records.label') }}</span>
            <input v-model="recordForm.label" required class="mt-1 input w-full"
                   :placeholder="$t('tco.records.labelPlaceholder')" />
          </label>
          <label class="block text-xs">
            <span class="text-gray-400">{{ $t('tco.records.vendor') }} ({{ $t('common.optional') }})</span>
            <input v-model="recordForm.vendor" class="mt-1 input w-full" />
          </label>
          <label class="block text-xs">
            <span class="text-gray-400">{{ $t('tco.records.notes') }} ({{ $t('common.optional') }})</span>
            <textarea v-model="recordForm.notes" rows="2" class="mt-1 input w-full"></textarea>
          </label>
          <div class="flex gap-2 justify-end">
            <button @click="recordForm = null" class="btn-secondary text-sm">{{ $t('common.cancel') }}</button>
            <button @click="saveRecord" :disabled="!canSaveRecord" class="btn-primary text-sm">
              {{ recordForm.id ? $t('common.save') : $t('tco.records.create') }}
            </button>
          </div>
        </div>

        <table v-if="records.length > 0" class="w-full text-sm">
          <thead class="text-xs text-gray-500 border-b border-gray-700">
            <tr>
              <th class="text-left py-2">{{ $t('tco.records.date') }}</th>
              <th class="text-left py-2">{{ $t('tco.records.category') }}</th>
              <th class="text-left py-2">{{ $t('tco.records.label') }}</th>
              <th class="text-right py-2 hidden sm:table-cell">{{ $t('tco.records.odometer') }}</th>
              <th class="text-right py-2">{{ $t('tco.records.cost') }}</th>
              <th v-if="canEdit" class="w-16"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr v-for="r in records" :key="r.id" class="hover:bg-gray-800/40">
              <td class="py-2 text-gray-300">{{ fmtDate(r.performed_at) }}</td>
              <td class="py-2">
                <span class="text-xs px-2 py-0.5 rounded-full bg-gray-700">
                  {{ $t('tco.categories.' + r.category) }}
                </span>
              </td>
              <td class="py-2">
                <p>{{ r.label }}</p>
                <p v-if="r.vendor" class="text-[11px] text-gray-500">{{ r.vendor }}</p>
              </td>
              <td class="py-2 text-right text-gray-300 tabular-nums hidden sm:table-cell">
                {{ r.odometer_km != null ? fmtKm(r.odometer_km) : '—' }}
              </td>
              <td class="py-2 text-right font-semibold tabular-nums">{{ fmtEur(r.cost_eur) }}</td>
              <td v-if="canEdit" class="py-2 text-right">
                <button @click="openRecordForm(r)" class="text-xs text-blue-400 hover:underline mr-2">{{ $t('common.edit') }}</button>
                <button @click="deleteRecord(r)" class="text-xs text-red-400 hover:underline">✕</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else-if="!recordForm" class="text-sm text-gray-500 py-2">{{ $t('tco.records.empty') }}</p>
      </div>

      <!-- Stammdaten -->
      <div id="tco-base-form" ref="baseFormCard" class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">{{ $t('tco.base.title') }}</h2>
          <button v-if="canEdit && !baseFormOpen" @click="openBaseForm" class="text-sm text-blue-400 hover:underline">
            ✎ {{ $t('common.edit') }}
          </button>
        </div>
        <div v-if="baseFormOpen" class="space-y-3">
          <!-- Finanzierungs-Typ-Wahl: Kauf vs. Leasing -->
          <div class="flex gap-2 text-xs">
            <button type="button"
                    @click="baseForm.is_leasing = false"
                    :class="['flex-1 px-3 py-2 rounded border', !baseForm.is_leasing ? 'bg-blue-500/20 border-blue-500/60 text-blue-200' : 'border-gray-700 text-gray-400']">
              💶 {{ $t('tco.base.purchaseType.purchase') }}
            </button>
            <button type="button"
                    @click="baseForm.is_leasing = true"
                    :class="['flex-1 px-3 py-2 rounded border', baseForm.is_leasing ? 'bg-blue-500/20 border-blue-500/60 text-blue-200' : 'border-gray-700 text-gray-400']">
              📄 {{ $t('tco.base.purchaseType.leasing') }}
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <template v-if="!baseForm.is_leasing">
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.purchasePrice') }} (EUR)</span>
                <input type="number" step="0.01" v-model="baseForm.purchase_price_eur" class="mt-1 input w-full" />
              </label>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.purchaseDate') }}</span>
                <input type="date" v-model="baseForm.purchase_date_str" class="mt-1 input w-full" />
              </label>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.salePrice') }} (EUR)</span>
                <input type="number" step="0.01" v-model="baseForm.sale_price_eur" class="mt-1 input w-full"
                       :placeholder="$t('tco.base.salePricePlaceholder')" />
              </label>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.saleDate') }}</span>
                <input type="date" v-model="baseForm.sale_date_str" class="mt-1 input w-full" />
              </label>
            </template>

            <template v-else>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.leasing.startDate') }}</span>
                <input type="date" v-model="baseForm.purchase_date_str" class="mt-1 input w-full" />
              </label>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.leasing.termMonths') }}</span>
                <input type="number" step="1" v-model="baseForm.leasing_term_months" class="mt-1 input w-full"
                       :placeholder="$t('tco.base.leasing.termPlaceholder')" />
              </label>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.leasing.downPayment') }} (EUR)</span>
                <input type="number" step="0.01" v-model="baseForm.leasing_down_payment_eur" class="mt-1 input w-full" />
              </label>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.leasing.monthlyRate') }} (EUR)</span>
                <input type="number" step="0.01" v-model="baseForm.leasing_monthly_rate_eur" class="mt-1 input w-full" />
              </label>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.leasing.buyback') }} (EUR)</span>
                <input type="number" step="0.01" v-model="baseForm.leasing_buyback_eur" class="mt-1 input w-full"
                       :placeholder="$t('tco.base.leasing.buybackPlaceholder')" />
                <span class="text-[11px] text-gray-500">{{ $t('tco.base.leasing.buybackHint') }}</span>
              </label>
              <label class="block text-xs">
                <span class="text-gray-400">{{ $t('tco.base.leasing.includedKm') }}</span>
                <input type="number" step="1000" v-model="baseForm.leasing_included_km" class="mt-1 input w-full"
                       :placeholder="$t('tco.base.leasing.includedKmPlaceholder')" />
                <span class="text-[11px] text-gray-500">{{ $t('tco.base.leasing.includedKmHint') }}</span>
              </label>
              <label class="block text-xs col-span-2">
                <span class="text-gray-400">{{ $t('tco.base.leasing.extraKmRate') }} (EUR/km)</span>
                <input type="number" step="0.001" v-model="baseForm.leasing_extra_km_rate_eur" class="mt-1 input w-full"
                       :placeholder="$t('tco.base.leasing.extraKmRatePlaceholder')" />
              </label>
            </template>

            <label class="block text-xs">
              <span class="text-gray-400">{{ $t('tco.base.insurance') }} (EUR/{{ $t('tco.base.perYear') }})</span>
              <input type="number" step="0.01" v-model="baseForm.insurance_eur_year" class="mt-1 input w-full" />
            </label>
            <label class="block text-xs">
              <span class="text-gray-400">{{ $t('tco.base.tax') }} (EUR/{{ $t('tco.base.perYear') }})</span>
              <input type="number" step="0.01" v-model="baseForm.tax_eur_year" class="mt-1 input w-full" />
            </label>
            <label class="block text-xs col-span-2">
              <span class="text-gray-400">{{ $t('tco.base.initialKm') }}</span>
              <input type="number" step="1" v-model="baseForm.initial_odometer_km" class="mt-1 input w-full"
                     :placeholder="$t('tco.base.initialKmPlaceholder')" />
              <span class="text-[11px] text-gray-500">{{ $t('tco.base.initialKmHint') }}</span>
            </label>
          </div>
          <div class="flex gap-2 justify-end">
            <button @click="baseFormOpen = false" class="btn-secondary text-sm">{{ $t('common.cancel') }}</button>
            <button @click="saveBase" class="btn-primary text-sm">{{ $t('common.save') }}</button>
          </div>
        </div>
        <dl v-else class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div class="col-span-2 mb-1">
            <span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
                  :class="data.vehicle.is_leasing ? 'bg-purple-500/15 text-purple-300' : 'bg-blue-500/15 text-blue-300'">
              {{ data.vehicle.is_leasing ? ('📄 ' + $t('tco.base.purchaseType.leasing')) : ('💶 ' + $t('tco.base.purchaseType.purchase')) }}
            </span>
          </div>
          <template v-if="!data.vehicle.is_leasing">
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.purchasePrice') }}</dt>
                 <dd class="font-medium">{{ fmtEurOrDash(data.vehicle.purchase_price_eur) }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.purchaseDate') }}</dt>
                 <dd class="font-medium">{{ data.vehicle.purchase_date ? fmtDate(data.vehicle.purchase_date) : '—' }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.salePrice') }}</dt>
                 <dd class="font-medium">{{ fmtEurOrDash(data.vehicle.sale_price_eur) }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.saleDate') }}</dt>
                 <dd class="font-medium">{{ data.vehicle.sale_date ? fmtDate(data.vehicle.sale_date) : '—' }}</dd></div>
          </template>
          <template v-else>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.leasing.startDate') }}</dt>
                 <dd class="font-medium">{{ data.vehicle.purchase_date ? fmtDate(data.vehicle.purchase_date) : '—' }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.leasing.termMonths') }}</dt>
                 <dd class="font-medium">{{ data.vehicle.leasing_term_months != null ? data.vehicle.leasing_term_months + ' Mon.' : '—' }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.leasing.downPayment') }}</dt>
                 <dd class="font-medium">{{ fmtEurOrDash(data.vehicle.leasing_down_payment_eur) }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.leasing.monthlyRate') }}</dt>
                 <dd class="font-medium">{{ fmtEurOrDash(data.vehicle.leasing_monthly_rate_eur) }}{{ data.vehicle.leasing_monthly_rate_eur != null ? ' / Mon.' : '' }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.leasing.buyback') }}</dt>
                 <dd class="font-medium">{{ fmtEurOrDash(data.vehicle.leasing_buyback_eur) }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.leasing.includedKm') }}</dt>
                 <dd class="font-medium">{{ data.vehicle.leasing_included_km != null ? fmtKm(data.vehicle.leasing_included_km) : '—' }}</dd></div>
            <div><dt class="text-xs text-gray-500">{{ $t('tco.base.leasing.extraKmRate') }}</dt>
                 <dd class="font-medium">{{ data.vehicle.leasing_extra_km_rate_eur != null ? (data.vehicle.leasing_extra_km_rate_eur.toFixed(3) + ' €/km') : '—' }}</dd></div>
            <div v-if="data.summary.leasing_extra_km_eur != null && data.summary.leasing_extra_km_eur > 0">
              <dt class="text-xs text-amber-400">{{ $t('tco.base.leasing.extraKmCosts') }}</dt>
              <dd class="font-medium text-amber-300">{{ fmtEurOrDash(data.summary.leasing_extra_km_eur) }}</dd>
            </div>
          </template>
          <div><dt class="text-xs text-gray-500">{{ $t('tco.base.insurance') }}</dt>
               <dd class="font-medium">{{ fmtEurOrDash(data.vehicle.insurance_eur_year) }}{{ data.vehicle.insurance_eur_year != null ? ' / ' + $t('tco.base.perYear') : '' }}</dd></div>
          <div><dt class="text-xs text-gray-500">{{ $t('tco.base.tax') }}</dt>
               <dd class="font-medium">{{ fmtEurOrDash(data.vehicle.tax_eur_year) }}{{ data.vehicle.tax_eur_year != null ? ' / ' + $t('tco.base.perYear') : '' }}</dd></div>
          <div><dt class="text-xs text-gray-500">{{ $t('tco.base.initialKm') }}</dt>
               <dd class="font-medium">{{ data.vehicle.initial_odometer_km != null ? fmtKm(data.vehicle.initial_odometer_km) : '—' }}</dd></div>
          <div><dt class="text-xs text-gray-500">{{ $t('tco.base.currentKm') }}</dt>
               <dd class="font-medium">{{ data.vehicle.odometer_km != null ? fmtKm(data.vehicle.odometer_km) : '—' }}</dd></div>
        </dl>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppStore } from '../store/index.js';
import { useAuthStore } from '../store/auth.js';
import api from '../api.js';

const { t } = useI18n();
const appStore = useAppStore();
const auth     = useAuthStore();

const CATEGORIES = ['service', 'tires', 'repair', 'inspection', 'tuv', 'accessories', 'other'];

const data    = ref(null);
const records = ref([]);
const forecast = ref(null);
const loading = ref(false);
const error   = ref('');

const canEdit = computed(() => auth.user?.role === 'admin');

const hasMinimalData = computed(() => {
  const v = data.value?.vehicle;
  if (!v) return false;
  // Leasing: Startdatum + Monatsrate reichen fuer eine sinnvolle TCO
  if (v.is_leasing) return !!(v.purchase_date && v.leasing_monthly_rate_eur);
  // Kauf: Anschaffungspreis + Datum
  return !!(v.purchase_price_eur && v.purchase_date);
});

const breakdownRows = computed(() => {
  if (!data.value) return [];
  const s = data.value.summary;
  return [
    { key: 'depreciation', icon: '📉', value: s.depreciation_eur,
      tooltip: s.residual_is_estimate ? t('tco.residualEstimateHint') : null },
    { key: 'insurance',    icon: '🛡',  value: s.insurance_eur },
    { key: 'tax',          icon: '🏛',  value: s.tax_eur },
    { key: 'electricity',  icon: '⚡',  value: s.electricity_eur || null },
    { key: 'service',      icon: '🔧', value: s.service_eur || null },
  ];
});

// 12-Monats-Kostenausblick (Drop 05) — Prognose aus den letzten 12 Monaten.
const forecastRows = computed(() => {
  if (!forecast.value?.predicted) return [];
  const p = forecast.value.predicted;
  return [
    { key: 'service',     icon: '🔧', value: p.service_eur || null },
    { key: 'electricity', icon: '⚡', value: p.electricity_eur || null },
    { key: 'insurance',   icon: '🛡', value: p.insurance_eur },
    { key: 'tax',         icon: '🏛', value: p.tax_eur },
  ];
});

// ── Service-Record-Form ────────────────────────────────────────────────────
const recordForm = ref(null);
const canSaveRecord = computed(() =>
  !!(recordForm.value?.dateStr && recordForm.value?.label?.trim() && recordForm.value?.cost_eur != null && recordForm.value?.category)
);

function openRecordForm(r = null) {
  recordForm.value = r ? {
    id: r.id,
    dateStr: new Date(r.performed_at * 1000).toISOString().slice(0, 10),
    odometer_km: r.odometer_km,
    category: r.category,
    label: r.label,
    cost_eur: r.cost_eur,
    vendor: r.vendor || '',
    notes: r.notes || '',
  } : {
    id: null,
    dateStr: new Date().toISOString().slice(0, 10),
    odometer_km: null,
    category: 'service',
    label: '',
    cost_eur: null,
    vendor: '',
    notes: '',
  };
}

async function saveRecord() {
  if (!canSaveRecord.value || !data.value) return;
  const vid = data.value.vehicle.id;
  const body = {
    performed_at: Math.floor(new Date(recordForm.value.dateStr).getTime() / 1000),
    odometer_km:  recordForm.value.odometer_km !== null && recordForm.value.odometer_km !== '' ? Number(recordForm.value.odometer_km) : null,
    category:     recordForm.value.category,
    label:        recordForm.value.label.trim(),
    cost_eur:     Number(recordForm.value.cost_eur),
    vendor:       recordForm.value.vendor?.trim() || null,
    notes:        recordForm.value.notes?.trim()  || null,
  };
  try {
    if (recordForm.value.id) {
      await api.patch(`/tco/vehicles/${vid}/service-records/${recordForm.value.id}`, body);
    } else {
      await api.post(`/tco/vehicles/${vid}/service-records`, body);
    }
    recordForm.value = null;
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  }
}

async function deleteRecord(r) {
  if (!confirm(t('tco.records.confirmDelete', { label: r.label }))) return;
  const vid = data.value.vehicle.id;
  try {
    await api.delete(`/tco/vehicles/${vid}/service-records/${r.id}`);
    await load();
  } catch (e) { error.value = e.response?.data?.error || e.message; }
}

// ── Stammdaten-Form ───────────────────────────────────────────────────────
const baseFormOpen = ref(false);
const baseForm = ref({});
const baseFormCard = ref(null);

function jumpToBaseForm() {
  openBaseForm();
  // Nach Render scrollen — nextTick reicht in den meisten Faellen
  setTimeout(() => {
    baseFormCard.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

function openBaseForm() {
  const v = data.value.vehicle;
  baseForm.value = {
    is_leasing:          !!v.is_leasing,
    purchase_price_eur:  v.purchase_price_eur,
    purchase_date_str:   v.purchase_date  ? new Date(v.purchase_date  * 1000).toISOString().slice(0, 10) : '',
    sale_price_eur:      v.sale_price_eur,
    sale_date_str:       v.sale_date      ? new Date(v.sale_date      * 1000).toISOString().slice(0, 10) : '',
    insurance_eur_year:  v.insurance_eur_year,
    tax_eur_year:        v.tax_eur_year,
    initial_odometer_km: v.initial_odometer_km,
    leasing_down_payment_eur:  v.leasing_down_payment_eur,
    leasing_monthly_rate_eur:  v.leasing_monthly_rate_eur,
    leasing_term_months:       v.leasing_term_months,
    leasing_buyback_eur:       v.leasing_buyback_eur,
    leasing_included_km:       v.leasing_included_km,
    leasing_extra_km_rate_eur: v.leasing_extra_km_rate_eur,
  };
  baseFormOpen.value = true;
}

async function saveBase() {
  if (!data.value) return;
  const f = baseForm.value;
  const body = {
    is_leasing:          !!f.is_leasing,
    purchase_price_eur:  f.purchase_price_eur === '' ? null : f.purchase_price_eur,
    purchase_date:       f.purchase_date_str ? Math.floor(new Date(f.purchase_date_str).getTime() / 1000) : null,
    sale_price_eur:      f.sale_price_eur === '' ? null : f.sale_price_eur,
    sale_date:           f.sale_date_str ? Math.floor(new Date(f.sale_date_str).getTime() / 1000) : null,
    insurance_eur_year:  f.insurance_eur_year === '' ? null : f.insurance_eur_year,
    tax_eur_year:        f.tax_eur_year === '' ? null : f.tax_eur_year,
    initial_odometer_km: f.initial_odometer_km === '' ? null : f.initial_odometer_km,
    leasing_down_payment_eur:  f.leasing_down_payment_eur === '' ? null : f.leasing_down_payment_eur,
    leasing_monthly_rate_eur:  f.leasing_monthly_rate_eur === '' ? null : f.leasing_monthly_rate_eur,
    leasing_term_months:       f.leasing_term_months === '' ? null : f.leasing_term_months,
    leasing_buyback_eur:       f.leasing_buyback_eur === '' ? null : f.leasing_buyback_eur,
    leasing_included_km:       f.leasing_included_km === '' ? null : f.leasing_included_km,
    leasing_extra_km_rate_eur: f.leasing_extra_km_rate_eur === '' ? null : f.leasing_extra_km_rate_eur,
  };
  try {
    const r = await api.patch(`/tco/vehicles/${data.value.vehicle.id}`, body);
    data.value = r.data;
    baseFormOpen.value = false;
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  }
}

// ── Load ───────────────────────────────────────────────────────────────────
async function load() {
  const v = appStore.selectedVehicle;
  if (!v) return;
  loading.value = true; error.value = '';
  try {
    const [tco, recs, fc] = await Promise.all([
      api.get(`/tco/vehicles/${v.id}`).then(r => r.data),
      api.get(`/tco/vehicles/${v.id}/service-records`).then(r => r.data),
      api.get(`/tco/vehicles/${v.id}/forecast`).then(r => r.data).catch(() => null),
    ]);
    data.value    = tco;
    records.value = recs;
    forecast.value = fc;
  } catch (e) {
    error.value = e.response?.data?.error || e.message;
  } finally {
    loading.value = false;
  }
}

watch(() => appStore.selectedVehicleId, load);
onMounted(load);

// ── Formatter ─────────────────────────────────────────────────────────────
const eurFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const eurFmt3 = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 3, maximumFractionDigits: 3 });
function fmtEur(v, d = 2) { return d === 3 ? eurFmt3.format(v) : eurFmt.format(v); }
function fmtEurOrDash(v) { return v == null ? '—' : fmtEur(v); }
function fmtKm(v)   { return Math.round(v).toLocaleString('de-DE') + ' km'; }
function fmtDate(unixSec) { return new Date(unixSec * 1000).toLocaleDateString('de-DE'); }
</script>

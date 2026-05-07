<template>
  <div class="max-w-2xl space-y-6">
    <h1 class="text-2xl font-bold">Einstellungen</h1>

    <!-- Vehicle profile -->
    <div class="card space-y-4">
      <h2 class="font-semibold" v-tooltip="'Kennzeichen, Farbe und Modell des Fahrzeugs einstellen – wird auf Dashboard und Technik-Seite angezeigt'">
        🚗 Fahrzeugprofil
      </h2>
      <div v-if="appStore.selectedVehicle" class="space-y-4">
        <div class="flex gap-4 items-center">
          <img :src="vehicleImageUrl" :alt="appStore.selectedVehicle.display_name"
            class="h-20 object-contain bg-gray-800 rounded-lg px-2"
            v-tooltip="'Fahrzeugvorschau basierend auf Modell und Farbe'" />
          <div class="text-sm">
            <p class="font-semibold text-white text-base">{{ appStore.selectedVehicle.display_name }}</p>
            <p class="text-gray-400">{{ vProfile.license_plate || 'Kein Kennzeichen' }}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label">Kennzeichen</label>
            <input v-model="vProfile.license_plate" type="text" class="input" placeholder="MU-TC 1337E"
              v-tooltip="'Amtliches Kennzeichen – wird auf dem Dashboard angezeigt. Format: Stadt-Buchstaben Zahl'" />
          </div>
          <div>
            <label class="label">Modell</label>
            <select v-model="vProfile.model" class="input"
              v-tooltip="'Tesla-Modell – bestimmt die Fahrzeugsilhouette in der Darstellung'">
              <option value="ms">Model S</option>
              <option value="mx">Model X</option>
              <option value="m3">Model 3</option>
              <option value="my">Model Y</option>
              <option value="ct">Cybertruck</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="label">Farbe</label>
            <select v-model="vProfile.image_color" class="input"
              v-tooltip="'Lackfarbe – Tesla-Farbcode für die korrekte Abbildung des Fahrzeugs'">
              <option value="PPSW">Pearl White Multi-Coat</option>
              <option value="PMNG">Midnight Silver Metallic</option>
              <option value="PBSB">Obsidian Black Metallic</option>
              <option value="PPMR">Ultra Red</option>
              <option value="PPSB">Deep Blue Metallic</option>
              <option value="PPW">Solid White</option>
            </select>
          </div>
        </div>
        <p v-if="vMsg" :class="vOk ? 'text-green-400' : 'text-red-400'" class="text-sm">{{ vMsg }}</p>
        <button @click="saveVehicle" class="btn-primary text-sm"
          v-tooltip="'Fahrzeugprofil speichern – Änderungen werden sofort auf dem Dashboard sichtbar'">
          Speichern
        </button>
      </div>
      <p v-else class="text-gray-400 text-sm">Kein Fahrzeug verbunden.</p>
    </div>

    <div class="card space-y-3">
      <h2 class="font-semibold"
        v-tooltip="'Zwei-Faktor-Authentifizierung schützt dein Konto: auch wenn dein Passwort gestohlen wird, kann sich niemand ohne deinen zweiten Faktor anmelden.'">
        🔐 Zwei-Faktor-Authentifizierung
      </h2>
      <div v-if="mfaStatus.mfaEnabled" class="space-y-3">
        <div class="flex items-center gap-2 text-green-400">
          <span>✓</span><span class="text-sm">MFA ist aktiviert</span>
        </div>
        <p class="text-sm text-gray-400"
          v-tooltip="'Backup-Codes sind Einmal-Codes für den Notfall, falls du keinen Zugriff auf deine Authenticator-App hast (z.B. Handy verloren). Bei wenigen verbleibenden Codes solltest du MFA neu einrichten.'">
          Noch verwendbare Backup-Codes: <strong>{{ mfaStatus.unusedBackupCodes }}</strong>
        </p>
        <div v-if="!showDisableForm">
          <button @click="showDisableForm = true" class="btn-secondary text-sm"
            v-tooltip="'MFA komplett entfernen – dein Konto ist danach nur durch das Passwort geschützt. Nicht empfohlen.'">
            MFA deaktivieren
          </button>
        </div>
        <div v-else class="space-y-2">
          <p class="text-sm text-gray-400">Passwort zur Bestaetigung eingeben:</p>
          <input v-model="disablePassword" type="password"
            class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white" />
          <div v-if="disableError" class="text-red-400 text-sm">{{ disableError }}</div>
          <div class="flex gap-2">
            <button @click="disableMfa" class="btn-primary text-sm">Bestaetigen</button>
            <button @click="showDisableForm = false" class="btn-secondary text-sm">Abbrechen</button>
          </div>
        </div>
      </div>
      <div v-else class="space-y-2">
        <p class="text-sm text-gray-400">MFA ist nicht aktiviert. Aktiviere es fuer mehr Sicherheit.</p>
        <RouterLink to="/mfa/setup" class="btn-primary inline-block text-sm"
          v-tooltip="'Richtet MFA in 3 Schritten ein: QR-Code mit Authenticator-App scannen, Code bestätigen, Backup-Codes sichern. Dauert ca. 1 Minute.'">
          MFA aktivieren
        </RouterLink>
      </div>
    </div>

    <!-- Tesla Verbindung -->
    <div class="card space-y-4">
      <h2 class="font-semibold">⚡ Tesla-Verbindung</h2>

      <div class="flex items-center gap-3">
        <span class="text-sm" :class="teslaConnected ? 'text-green-400' : 'text-red-400'">
          {{ teslaConnected ? '● Verbunden' : '● Nicht verbunden' }}
        </span>
        <a :href="teslaLoginUrl" class="btn-primary text-sm"
          v-tooltip="'Tesla-Account neu verbinden – holt einen neuen Token mit allen benötigten Scopes'">
          Tesla neu verbinden
        </a>
      </div>

      <!-- Virtual Key -->
      <div class="border-t border-gray-700 pt-4 space-y-3">
        <div>
          <p class="font-medium text-sm">Virtual Key (Fahrzeugbefehle)</p>
          <p class="text-xs text-gray-400 mt-0.5">Einmalig am Fahrzeug registrieren damit Klima, Türen und Laden funktionieren</p>
        </div>
        <div class="bg-gray-800 rounded-xl p-4 space-y-3 text-sm">
          <ol class="space-y-2 text-gray-300">
            <li class="flex gap-2"><span class="text-tesla-red font-bold">1.</span> iPhone nahe am Auto, Bluetooth ein, Tesla-App offen</li>
            <li class="flex gap-2"><span class="text-tesla-red font-bold">2.</span> Diesen Link im iPhone-Browser öffnen:</li>
          </ol>
          <a href="https://tesla.com/_ak/your-domain.example.com" target="_blank"
            class="block w-full text-center py-2 rounded-lg bg-tesla-red hover:bg-red-700 text-white font-medium transition">
            tesla.com/_ak/your-domain.example.com
          </a>
          <p class="text-xs text-gray-500">Tesla-App zeigt "Drittanbieter-Schlüssel hinzufügen" → Allow tippen. Danach funktionieren alle Steuerbefehle.</p>
        </div>
      </div>
    </div>

    <div class="card space-y-3">
      <h2 class="font-semibold">🔑 Passwort ändern</h2>
      <div class="space-y-2">
        <input v-model="pw.current" type="password" placeholder="Aktuelles Passwort"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Dein bisheriges Passwort – zur Bestätigung deiner Identität'" />
        <input v-model="pw.next" type="password" placeholder="Neues Passwort (mind. 12 Zeichen)"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Mindestens 12 Zeichen. Empfohlen: Passphrase aus 4+ zufälligen Wörtern (z.B. „Spaten-Berg-Donau-Mozart“) – ist sicherer als kurze, komplexe Passwörter und leichter zu merken.'" />
        <input v-model="pw.confirm" type="password" placeholder="Neues Passwort wiederholen"
          class="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
          v-tooltip="'Bitte das neue Passwort zur Sicherheit erneut eingeben'" />
        <div v-if="pwError" class="text-red-400 text-sm">{{ pwError }}</div>
        <div v-if="pwSuccess" class="text-green-400 text-sm">{{ pwSuccess }}</div>
        <button @click="changePassword" class="btn-primary text-sm">Passwort ändern</button>
      </div>
    </div>

    <div class="card space-y-3">
      <h2 class="font-semibold"
        v-tooltip="'Auflistung deiner letzten Sicherheits-Aktivitäten. Falls du hier verdächtige Einträge siehst (z.B. Login von unbekannten IPs), ändere sofort dein Passwort.'">
        📝 Letzte Aktivitäten
      </h2>
      <div class="space-y-1">
        <div v-for="e in auditLog" :key="e.created_at"
          class="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
          <span class="font-mono text-gray-300" v-tooltip="actionTooltip(e.action)">{{ e.action }}</span>
          <span class="text-gray-500" v-tooltip="'IP-Adresse: ' + (e.ip_address || 'unbekannt')">{{ fmtDate(e.created_at) }}</span>
        </div>
        <p v-if="!auditLog.length" class="text-gray-500 text-sm">Keine Einträge</p>
      </div>
    </div>

    <div class="card">
      <button @click="logout" class="text-red-400 hover:text-red-300 text-sm transition"
        v-tooltip="'Aktuelle Session beenden – du wirst zur Login-Seite weitergeleitet'">Abmelden</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api.js';
import { useAuthStore } from '../store/auth.js';
import { useAppStore } from '../store/index.js';

const auth     = useAuthStore();
const appStore = useAppStore();
const router   = useRouter();

const teslaConnected = ref(false);
const teslaLoginUrl  = ref('/api/auth/tesla/login');

// Vehicle profile
const vProfile = ref({ license_plate: '', model: 'm3', image_color: 'PPSW' });
const vMsg = ref('');
const vOk  = ref(false);

const vehicleImageUrl = computed(() => {
  const v = appStore.selectedVehicle;
  if (!v) return '';
  return `https://static-assets.tesla.com/configurator/compositor?&options=${vProfile.value.image_color || 'PPSW'}&view=STUD_3QTR&model=${vProfile.value.model || 'm3'}&size=400`;
});

async function saveVehicle() {
  vMsg.value = ''; vOk.value = false;
  const v = appStore.selectedVehicle;
  if (!v) return;
  try {
    const { data } = await api.put(`/vehicles/${v.id}`, vProfile.value);
    Object.assign(v, data);
    vMsg.value = 'Fahrzeugprofil gespeichert ✓';
    vOk.value = true;
  } catch (e) {
    vMsg.value = e.response?.data?.error ?? 'Fehler beim Speichern';
  }
}

const mfaStatus       = ref({ mfaEnabled: false, unusedBackupCodes: 0 });
const showDisableForm = ref(false);
const disablePassword = ref('');
const disableError    = ref('');
const pw              = ref({ current: '', next: '', confirm: '' });
const pwError         = ref('');
const pwSuccess       = ref('');
const auditLog        = ref([]);

const fmtDate = ts => new Date(ts * 1000).toLocaleString('de-DE');

const actionTooltips = {
  login_success:     'Erfolgreiche Anmeldung',
  login_failed:      'Fehlgeschlagener Login-Versuch (falsches Passwort oder unbekannter Benutzer)',
  login_blocked:     'Login blockiert wegen zu vieler Fehlversuche',
  login_mfa_pending: 'Passwort akzeptiert, MFA-Code wurde angefordert',
  mfa_failed:        'MFA-Code war ungültig',
  mfa_enabled:       'Zwei-Faktor-Authentifizierung wurde aktiviert',
  mfa_disabled:      'Zwei-Faktor-Authentifizierung wurde deaktiviert',
  password_changed:  'Passwort wurde geändert',
  logout:            'Abmeldung',
};
const actionTooltip = a => actionTooltips[a] || a;

onMounted(async () => {
  const [mfa, audit, teslaStatus] = await Promise.all([
    api.get('/mfa/status'),
    api.get('/users/me/audit'),
    api.get('/auth/tesla/status').catch(() => ({ data: { connected: false } })),
  ]);
  mfaStatus.value      = mfa.data;
  auditLog.value       = audit.data;
  teslaConnected.value = teslaStatus.data.connected;

  const v = appStore.selectedVehicle;
  if (v) {
    vProfile.value = {
      license_plate: v.license_plate ?? '',
      model:         v.model ?? 'm3',
      image_color:   v.image_color ?? 'PPSW',
    };
  }
});

async function disableMfa() {
  disableError.value = '';
  try {
    await api.post('/mfa/disable', { password: disablePassword.value });
    mfaStatus.value.mfaEnabled = false;
    showDisableForm.value = false;
  } catch (err) {
    disableError.value = err.response?.data?.error || 'Fehler';
  }
}

async function changePassword() {
  pwError.value = pwSuccess.value = '';
  if (pw.value.next !== pw.value.confirm) {
    pwError.value = 'Passwoerter stimmen nicht ueberein';
    return;
  }
  if (pw.value.next.length < 12) {
    pwError.value = 'Passwort muss mindestens 12 Zeichen lang sein';
    return;
  }
  try {
    await api.put('/users/me/password', {
      currentPassword: pw.value.current,
      newPassword: pw.value.next,
    });
    pwSuccess.value = 'Passwort erfolgreich geändert';
    pw.value = { current: '', next: '', confirm: '' };
  } catch (err) {
    pwError.value = err.response?.data?.error || 'Fehler beim Aendern';
  }
}

async function logout() {
  await auth.logout();
  router.push('/login');
}
</script>

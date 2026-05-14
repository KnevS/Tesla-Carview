import { defineStore } from 'pinia';
import api from '../api.js';

const TENANT_SLUG_KEY = 'tc_tenant_slug';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken:  null,
    user:         null,
    mfaTempToken: null,
    tenantSlug:   localStorage.getItem(TENANT_SLUG_KEY) || null,
    availableTenants: [],
  }),
  getters: {
    isAuthenticated: s => !!s.accessToken && !!s.user,
    isAdmin:         s => s.user?.role === 'admin',
    // /me liefert snake_case (`mfa_required`, `mfa_enabled`, `can_*`),
    // /login liefert camelCase. Beides akzeptieren — sonst kippt der
    // Guard zwischen Refresh und Frisch-Login. Admin hat alles immer.
    mustEnableMfa:   s => {
      if (!s.user || s.user.role === 'admin') return false;
      const required = !!(s.user.mfaRequired ?? s.user.mfa_required);
      const enabled  = !!(s.user.mfaEnabled  ?? s.user.mfa_enabled);
      return required && !enabled;
    },
    canEditVehicles: s => s.user?.role === 'admin'
      || !!(s.user?.canEditVehicles ?? s.user?.can_edit_vehicles),
    canAddVehicles:  s => s.user?.role === 'admin'
      || !!(s.user?.canAddVehicles  ?? s.user?.can_add_vehicles),
    // Demo-Mandant erkennen: /me liefert is_demo + tenantSlug.
    isDemo:          s => !!s.user?.is_demo || s.tenantSlug === 'demo' || s.user?.tenantSlug === 'demo',
  },
  actions: {
    async loadTenants() {
      try {
        const { data } = await api.get('/auth/tenants');
        this.availableTenants = data;
        if (!this.tenantSlug) {
          if (data.length === 1) {
            this.tenantSlug = data[0].slug;
          } else {
            // Bei mehreren Mandanten: auto-select wenn genau ein nicht-Demo-Mandant aktiv
            const nonDemo = data.filter(t => !t.is_demo);
            if (nonDemo.length === 1) this.tenantSlug = nonDemo[0].slug;
          }
        }
      } catch { /* ignorieren */ }
    },

    async login(username, password, tenantSlug) {
      const slug = tenantSlug || this.tenantSlug || undefined;
      const { data } = await api.post('/auth/login', { username, password, tenantSlug: slug });
      if (data.requiresMfa) {
        this.mfaTempToken = data.tempToken;
        return { requiresMfa: true };
      }
      this.accessToken = data.accessToken;
      this.user        = data.user;
      if (data.user?.tenantSlug) {
        this.tenantSlug = data.user.tenantSlug;
        localStorage.setItem(TENANT_SLUG_KEY, data.user.tenantSlug);
      }
      return { requiresMfa: false };
    },

    async verifyMfa(code) {
      const { data } = await api.post('/auth/mfa/verify', { tempToken: this.mfaTempToken, code });
      this.accessToken  = data.accessToken;
      this.user         = data.user;
      this.mfaTempToken = null;
    },

    async loginWithPasskey(tenantSlug) {
      const slug = tenantSlug || this.tenantSlug;
      // 1. Optionen laden
      const { data: opts } = await api.post('/passkey/login-options', { tenantSlug: slug });
      // 2. Browser-native Passkey-Prompt
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const response = await startAuthentication(opts);
      // 3. Verifizieren
      const { data } = await api.post('/passkey/login-verify', {
        challengeId: opts.challengeId,
        tenantId:    opts.tenantId,
        response,
      });
      this.accessToken = data.accessToken;
      this.user        = data.user;
      if (data.user?.tenantSlug) {
        this.tenantSlug = data.user.tenantSlug;
        localStorage.setItem(TENANT_SLUG_KEY, data.user.tenantSlug);
      }
    },

    async tryRestoreSession() {
      try {
        const token    = await this.refresh();
        const { data } = await api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        this.user = data;
        if (data.tenantSlug) {
          this.tenantSlug = data.tenantSlug;
          localStorage.setItem(TENANT_SLUG_KEY, data.tenantSlug);
        }
        return true;
      } catch { return false; }
    },

    async refresh() {
      const { data } = await api.post('/auth/refresh');
      this.accessToken = data.accessToken;
      return data.accessToken;
    },

    async logout() {
      try { await api.post('/auth/logout'); } catch { /* ignorieren */ }
      this.$reset();
    },
  },
});

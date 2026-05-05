import { defineStore } from 'pinia';
import api from '../api.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null,
    user: null,
    mfaTempToken: null,
  }),
  getters: {
    isAuthenticated: s => !!s.accessToken && !!s.user,
    isAdmin: s => s.user?.role === 'admin',
  },
  actions: {
    /** Login: gibt { requiresMfa } zurueck */
    async login(username, password) {
      const { data } = await api.post('/auth/login', { username, password });
      if (data.requiresMfa) {
        this.mfaTempToken = data.tempToken;
        return { requiresMfa: true };
      }
      this.accessToken = data.accessToken;
      this.user = data.user;
      return { requiresMfa: false };
    },

    /** MFA-Code verifizieren und Session abschliessen */
    async verifyMfa(code) {
      const { data } = await api.post('/auth/mfa/verify', {
        tempToken: this.mfaTempToken,
        code,
      });
      this.accessToken = data.accessToken;
      this.user = data.user;
      this.mfaTempToken = null;
    },

    /** Versucht bestehende Session per Refresh-Cookie wiederherzustellen */
    async tryRestoreSession() {
      try {
        const token = await this.refresh();
        // Benutzerdaten laden
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.user = data;
        return true;
      } catch {
        return false;
      }
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

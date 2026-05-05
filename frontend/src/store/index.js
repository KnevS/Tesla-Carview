import { defineStore } from 'pinia';
import api from '../api.js';

export const useAppStore = defineStore('app', {
  state: () => ({
    vehicles: [],
    selectedVehicleId: null,
    authStatus: null,
  }),
  getters: {
    selectedVehicle: (state) =>
      state.vehicles.find(v => v.id === state.selectedVehicleId) || state.vehicles[0] || null,
  },
  actions: {
    async loadVehicles() {
      const { data } = await api.get('/vehicles');
      this.vehicles = data;
      if (!this.selectedVehicleId && data.length > 0) {
        this.selectedVehicleId = data[0].id;
      }
    },
    async checkAuth() {
      const { data } = await api.get('/auth/status');
      this.authStatus = data.authenticated;
      return data.authenticated;
    },
    login() {
      window.location.href = '/api/auth/login';
    },
  },
});

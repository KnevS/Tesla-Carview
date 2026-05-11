import { defineStore } from 'pinia';
import api from '../api.js';

export const useAppStore = defineStore('app', {
  state: () => ({
    vehicles: [],
    selectedVehicleId: null,
  }),
  getters: {
    selectedVehicle: s =>
      s.vehicles.find(v => v.id === s.selectedVehicleId) || s.vehicles[0] || null,
  },
  actions: {
    async loadVehicles() {
      const { data } = await api.get('/vehicles');
      this.vehicles = data;
      if (!this.selectedVehicleId && data.length > 0) {
        this.selectedVehicleId = data[0].id;
      }
    },
  },
});

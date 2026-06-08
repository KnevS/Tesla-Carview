<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <footer class="app-footer">
    <div class="app-footer-inner">
      <p class="contact-prompt">{{ $t('footer.contactPrompt') }}</p>
      <ul v-if="EMAIL || aboutMeUrl || LINKEDIN_URL" class="contact-links">
        <li v-if="EMAIL">
          <a :href="`mailto:${EMAIL}`" rel="noopener" class="contact-link">
            <span aria-hidden="true">✉️</span>
            <span>{{ EMAIL }}</span>
          </a>
        </li>
        <li v-if="aboutMeUrl">
          <a :href="aboutMeUrl" target="_blank" rel="noopener" class="contact-link">
            <span aria-hidden="true">🪪</span>
            <span>{{ $t('footer.about') }}</span>
          </a>
        </li>
        <li v-if="LINKEDIN_URL">
          <a :href="LINKEDIN_URL" target="_blank" rel="noopener" class="contact-link">
            <span aria-hidden="true">💼</span>
            <span>LinkedIn</span>
          </a>
        </li>
      </ul>
      <ul class="legal-links">
        <li><RouterLink to="/legal/imprint">{{ $t('footer.imprint') }}</RouterLink></li>
        <li><RouterLink to="/legal/privacy">{{ $t('footer.privacy') }}</RouterLink></li>
        <li><RouterLink to="/legal/terms">{{ $t('footer.terms') }}</RouterLink></li>
        <li><RouterLink to="/support">❤ {{ $t('footer.support') }}</RouterLink></li>
      </ul>
      <p class="legal" v-if="showVersion">
        Tesla Carview · v{{ version }} · {{ buildHash }}
      </p>
      <p class="legal powered-by">
        Powered by
        <a href="https://github.com/KnevS/Tesla-Carview" target="_blank" rel="noopener">TeslaView</a>
        · © Sven Krische · PolyForm Noncommercial
      </p>
      <p v-if="isAiTranslated" class="legal" style="font-size: 10px; opacity: 0.65;">
        {{ $t('footer.aiTranslation') }}
      </p>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { AI_TRANSLATED_LOCALES } from '../plugins/i18n.js';

defineProps({
  showVersion: { type: Boolean, default: false },
  version:     { type: String,  default: '' },
  buildHash:   { type: String,  default: '' },
});

const { locale } = useI18n();

// Kontaktdaten — kommen aus frontend/.env (VITE_FOOTER_*) und werden von
// Vite zur Build-Zeit eingefuegt. Das .env-File ist .gitignored, sodass
// jeder Fork seine eigenen Werte pflegt; .env.example liegt als Vorlage
// im Repo. Wenn ein Wert leer ist, wird der zugehoerige Link
// im Template (siehe v-if oben) ausgeblendet.
const EMAIL        = import.meta.env.VITE_FOOTER_EMAIL        || '';
const ABOUT_DE     = import.meta.env.VITE_FOOTER_ABOUT_DE     || '';
const ABOUT_EN     = import.meta.env.VITE_FOOTER_ABOUT_EN     || '';
const LINKEDIN_URL = import.meta.env.VITE_FOOTER_LINKEDIN_URL || '';

const aboutMeUrl = computed(() => locale.value === 'de' ? ABOUT_DE : ABOUT_EN);
const isAiTranslated = computed(() => AI_TRANSLATED_LOCALES.includes(locale.value));
</script>

<style scoped>
.app-footer {
  width: 100%;
  margin-top: auto;
  padding: 1.4rem 1rem 1.2rem;
  border-top: 1px solid rgba(255,255,255,0.06);
  background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.18) 100%);
  font-size: 0.82rem;
  color: rgba(229,231,235,0.7);
}
.app-footer-inner {
  max-width: 56rem;
  margin: 0 auto;
  text-align: center;
}
.contact-prompt {
  margin: 0 0 0.6rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: rgba(229,231,235,0.85);
}
.contact-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.contact-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  color: inherit;
  text-decoration: none;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}
.contact-link:hover {
  background: rgba(99,102,241,0.18);
  border-color: rgba(99,102,241,0.4);
}
.contact-link:active { transform: scale(0.98); }
.legal-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.2rem 1rem;
  list-style: none;
  margin: 0.9rem 0 0;
  padding: 0;
  font-size: 0.78rem;
}
.legal-links a {
  color: inherit;
  text-decoration: none;
  opacity: 0.7;
  padding: 0.15rem 0.3rem;
  border-radius: 0.25rem;
  transition: opacity 0.15s ease, background 0.15s ease;
}
.legal-links a:hover {
  opacity: 1;
  background: rgba(255,255,255,0.05);
}
.legal {
  margin: 0.55rem 0 0;
  font-size: 0.72rem;
  opacity: 0.55;
  letter-spacing: 0.02em;
}

</style>

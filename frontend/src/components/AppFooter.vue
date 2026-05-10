<template>
  <footer class="app-footer">
    <div class="app-footer-inner">
      <p class="contact-prompt">{{ $t('footer.contactPrompt') }}</p>
      <ul class="contact-links">
        <li>
          <a :href="`mailto:${EMAIL}`" rel="noopener" class="contact-link">
            <span aria-hidden="true">✉️</span>
            <span>{{ EMAIL }}</span>
          </a>
        </li>
        <li>
          <a :href="aboutMeUrl" target="_blank" rel="noopener" class="contact-link">
            <span aria-hidden="true">🪪</span>
            <span>{{ $t('footer.about') }}</span>
          </a>
        </li>
        <li>
          <a :href="LINKEDIN_URL" target="_blank" rel="noopener" class="contact-link">
            <span aria-hidden="true">💼</span>
            <span>LinkedIn</span>
          </a>
        </li>
      </ul>
      <p class="legal" v-if="showVersion">
        Tesla Carview · v{{ version }} · {{ buildHash }}
      </p>
    </div>
  </footer>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps({
  showVersion: { type: Boolean, default: false },
  version:     { type: String,  default: '' },
  buildHash:   { type: String,  default: '' },
});

const { locale } = useI18n();

// Kontaktdaten zentral – wenn sich die Adresse ändert, nur hier anfassen.
const EMAIL        = 'it-passion-sven@krische.com';
const ABOUT_DE     = 'https://about.me/sven.Krische_de';
const ABOUT_EN     = 'https://about.me/sven.Krische';
const LINKEDIN_URL = 'https://www.linkedin.com/search/results/people/?keywords=Sven%20Krische';

const aboutMeUrl = computed(() => locale.value === 'de' ? ABOUT_DE : ABOUT_EN);
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
.legal {
  margin: 0.9rem 0 0;
  font-size: 0.72rem;
  opacity: 0.55;
  letter-spacing: 0.02em;
}

@media (prefers-color-scheme: light) {
  .app-footer {
    background: linear-gradient(180deg, transparent, rgba(0,0,0,0.04));
    color: rgba(31,41,55,0.7);
  }
  .contact-prompt { color: rgba(31,41,55,0.85); }
  .contact-link {
    background: rgba(0,0,0,0.04);
    border-color: rgba(0,0,0,0.08);
  }
}
</style>

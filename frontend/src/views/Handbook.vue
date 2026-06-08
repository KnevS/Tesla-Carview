<!-- © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview -->
<template>
  <div class="max-w-3xl space-y-8 pb-16">

    <!-- Inhaltsverzeichnis. Pro Eintrag das passende AppIcon vorn an,
         gemappt vom fuehrenden Emoji im Markdown-Heading. -->
    <div v-if="toc.length" class="card space-y-2 text-sm">
      <h2 class="font-semibold text-base mb-2 flex items-center gap-2">
        <AppIcon name="book" :size="20" class="text-tesla-red" />
        {{ tocLabel }}
      </h2>
      <a v-for="s in toc" :key="s.id" :href="`#${s.id}`"
        class="flex items-center gap-2 text-gray-400 hover:text-white py-1 border-b border-gray-800 last:border-0">
        <AppIcon v-if="s.icon" :name="s.icon" :size="16" class="text-tesla-red flex-shrink-0" />
        <span class="flex-1">{{ s.title }}</span>
      </a>
    </div>

    <!-- Markdown-Inhalt. Headings werden vom Markdown-Renderer mit dem
         passenden SVG-Icon (aus EMOJI_TO_ICON) versehen — siehe
         lib/icons.js. Sieht damit aus wie das uebrige Tesla-Carview-UI. -->
    <div class="handbook-content prose prose-invert max-w-none" v-html="html"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { marked } from 'marked';
import { useLangStore } from '../store/lang.js';
import { i18n } from '../plugins/i18n.js';
import AppIcon from '../components/AppIcon.vue';
import { renderIconSvg, extractLeadingEmoji } from '../lib/icons.js';

// Vite import-glob: alle Markdown-Handbücher als Raw-String, lazy.
const handbookFiles = import.meta.glob('../handbook/handbook.*.md', {
  query: '?raw',
  import: 'default',
});

const langStore = useLangStore();
const markdown = ref('');

const tocLabelMap = {
  de: 'Inhaltsverzeichnis',
  en: 'Table of contents',
  fr: 'Table des matières',
  es: 'Índice',
  tr: 'İçindekiler',
  el: 'Πίνακας περιεχομένων',
};

const currentLocale = computed(() => langStore.current || i18n.global.locale.value || 'de');
const tocLabel = computed(() => tocLabelMap[currentLocale.value] || tocLabelMap.de);

/* Markdown-Loader mit Fallback auf de.
 * import.meta.glob-Keys sind statisch zur Build-Zeit, daher der Map-Lookup. */
async function loadMarkdown(locale) {
  const tryKey = `../handbook/handbook.${locale}.md`;
  const fallbackKey = '../handbook/handbook.de.md';
  const loader = handbookFiles[tryKey] || handbookFiles[fallbackKey];
  if (!loader) return '';
  try {
    return await loader();
  } catch {
    if (handbookFiles[fallbackKey]) {
      try { return await handbookFiles[fallbackKey](); } catch { /* ignorieren */ }
    }
    return '';
  }
}

/* Heading-Anchor-Extraktion: `## Title {#anchor}` → id="anchor", Titel ohne Anhang.
 * Ohne expliziten Anchor: slug aus dem reinen Titel-Text. */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/* TOC + HTML in einem Durchgang: lexer → walk h2 → renderer mit id-Patch.
 * marked.parser() + custom renderer reicht; wir setzen heading-IDs direkt. */
const html = computed(() => {
  if (!markdown.value) return '';

  const renderer = new marked.Renderer();
  const origHeading = renderer.heading.bind(renderer);

  renderer.heading = (token) => {
    // marked v12+: token-Objekt {tokens, depth, raw, text}
    const text = token.text || '';
    const depth = token.depth;
    const m = text.match(/^(.*?)\s*\{#([\w-]+)\}\s*$/);
    let id, displayText;
    if (m) {
      displayText = m[1].trim();
      id = m[2];
    } else {
      displayText = text;
      id = slugify(text);
    }
    // Fuehrendes Emoji erkennen und durch das passende AppIcon-SVG
    // ersetzen, damit der Heading visuell zum Rest der App passt.
    // Bei depth=2 (Hauptsektionen) machen wir das; tiefere Ebenen
    // bleiben mit Original-Glyphe, weil sie eher beschreibend sind.
    let iconHtml = '';
    if (depth === 2) {
      const { iconName, rest } = extractLeadingEmoji(displayText);
      if (iconName) {
        iconHtml = renderIconSvg(iconName, { size: 22 });
        displayText = rest;
      }
    }
    const inlineHtml = marked.parseInline(displayText);
    const headingClass = depth === 2 ? ' class="handbook-h-with-icon"' : '';
    return `<h${depth} id="${id}"${headingClass}>${iconHtml}<span>${inlineHtml}</span></h${depth}>\n`;
  };

  marked.setOptions({ gfm: true, breaks: false });
  return marked.parse(markdown.value, { renderer });
});

const toc = computed(() => {
  if (!markdown.value) return [];
  const tokens = marked.lexer(markdown.value);
  return tokens
    .filter((t) => t.type === 'heading' && t.depth === 2)
    .map((t) => {
      const text = t.text || '';
      const m = text.match(/^(.*?)\s*\{#([\w-]+)\}\s*$/);
      const rawTitle = (m ? m[1] : text).trim();
      const id = m ? m[2] : slugify(text);
      // fuehrendes Emoji aus dem TOC-Eintrag entfernen — wir zeigen
      // stattdessen das passende AppIcon vor dem Text. Konsistent mit
      // dem Heading-Rendering im Markdown-Body.
      const { iconName, rest } = extractLeadingEmoji(rawTitle);
      return { id, title: iconName ? rest : rawTitle, icon: iconName };
    });
});

async function refresh() {
  markdown.value = await loadMarkdown(currentLocale.value);
}

watch(currentLocale, refresh);
onMounted(refresh);
</script>

<style scoped>
/* Prose-ähnliches Styling — wir verlassen uns nicht auf @tailwindcss/typography
 * (nicht installiert), sondern setzen die wichtigsten Regeln selbst.
 * Tesla-Carview-Theme: dunkler Hintergrund, helle Akzente. */
.handbook-content :deep(h1) {
  font-size: 1.875rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  text-align: center;
}
.handbook-content :deep(h1 + p) {
  text-align: center;
  color: #9ca3af;
  margin-bottom: 1.5rem;
}
.handbook-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  border-bottom: 1px solid #374151;
  padding-bottom: 0.5rem;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  scroll-margin-top: 1rem;
}
/* Heading mit Icon: Icon links, Text dahinter — flex sorgt fuer
 * vertikale Mittigkeit, der Tesla-Akzent-Farbton lockt das Auge. */
.handbook-content :deep(h2.handbook-h-with-icon) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.handbook-content :deep(h2.handbook-h-with-icon > .handbook-h-icon) {
  color: var(--accent, #ef4444);
  flex-shrink: 0;
}
.handbook-content :deep(h3) {
  font-size: 1.05rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: #fff;
}
.handbook-content :deep(p) {
  color: #d1d5db;
  line-height: 1.625;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}
.handbook-content :deep(ul),
.handbook-content :deep(ol) {
  color: #9ca3af;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
  padding-left: 1.25rem;
}
.handbook-content :deep(ul) { list-style: disc; }
.handbook-content :deep(ol) { list-style: decimal; }
.handbook-content :deep(li) { margin-bottom: 0.25rem; line-height: 1.55; }
.handbook-content :deep(li > p) { margin-bottom: 0.25rem; }
.handbook-content :deep(strong) { color: #fff; font-weight: 600; }
.handbook-content :deep(em) { color: #d1d5db; font-style: italic; }
.handbook-content :deep(a) { color: #ef4444; text-decoration: underline; }
.handbook-content :deep(a:hover) { color: #fca5a5; }
.handbook-content :deep(code) {
  background: #1f2937;
  color: #e5e7eb;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-family: ui-monospace, monospace;
}
.handbook-content :deep(pre) {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 0.5rem;
  padding: 0.875rem 1rem;
  overflow-x: auto;
  font-size: 0.8125rem;
  line-height: 1.55;
  margin: 0.75rem 0;
  color: #e5e7eb;
}
.handbook-content :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: inherit;
  color: inherit;
}
.handbook-content :deep(blockquote) {
  border-left: 3px solid #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.75rem 1rem;
  margin: 0.75rem 0;
  color: #93c5fd;
  font-size: 0.875rem;
  border-radius: 0 0.375rem 0.375rem 0;
}
.handbook-content :deep(blockquote p) { color: #93c5fd; margin-bottom: 0.25rem; }
.handbook-content :deep(blockquote strong) { color: #dbeafe; }
.handbook-content :deep(hr) { border-color: #374151; margin: 1.5rem 0; }
</style>

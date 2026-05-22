import { computed } from 'vue';
import { usePrefsStore } from '../store/prefs.js';

// Modul-globale Drag-State — shared zwischen allen SortableSection-Instanzen
// auf der selben Seite, ohne Event-Bus.
export let _dragState = { pageId: null, sectionId: null };

export function usePageLayout(pageId, defaultSections) {
  const prefs = usePrefsStore();

  const layoutData = computed(() => {
    const stored = prefs.data.layout?.[pageId];
    if (!stored) {
      return { order: [...defaultSections], collapsed: [] };
    }
    // Neue Sektionen, die nach dem Speichern hinzugekommen sind, ans Ende hängen
    const extra = defaultSections.filter(id => !stored.order.includes(id));
    return {
      order:     [...stored.order, ...extra],
      collapsed: stored.collapsed ?? [],
    };
  });

  const orderedSections = computed(() => layoutData.value.order);

  function isCollapsed(sectionId) {
    return layoutData.value.collapsed.includes(sectionId);
  }

  function toggle(sectionId) {
    const { order, collapsed } = layoutData.value;
    const newCollapsed = isCollapsed(sectionId)
      ? collapsed.filter(id => id !== sectionId)
      : [...collapsed, sectionId];
    _save({ order, collapsed: newCollapsed });
  }

  function moveSection(fromId, toId, position = 'before') {
    if (!fromId || !toId || fromId === toId) return;
    const order = [...layoutData.value.order];
    const fromIdx = order.indexOf(fromId);
    if (fromIdx === -1) return;
    order.splice(fromIdx, 1);
    const toIdx = order.indexOf(toId);
    if (toIdx === -1) return;
    order.splice(position === 'after' ? toIdx + 1 : toIdx, 0, fromId);
    _save({ ...layoutData.value, order });
  }

  function _save(layout) {
    const all = { ...(prefs.data.layout ?? {}) };
    all[pageId] = layout;
    prefs.set('layout', all);
  }

  return { orderedSections, isCollapsed, toggle, moveSection };
}

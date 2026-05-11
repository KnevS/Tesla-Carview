// Globale v-tooltip Direktive
// Erzeugt einen einzelnen, geteilten Tooltip-DOM-Knoten,
// positioniert ihn unter dem Ziel-Element und blendet ihn ein/aus.
// Funktioniert mit Maus (mouseenter) und Tastatur (focus).

let el = null;
let currentTarget = null;

function createTooltipEl() {
  if (el) return el;
  el = document.createElement('div');
  el.setAttribute('role', 'tooltip');
  el.style.cssText = [
    'position: fixed',
    'background: rgba(23, 26, 32, 0.97)',
    'color: #fff',
    'padding: 8px 12px',
    'border-radius: 8px',
    'font-size: 13px',
    'line-height: 1.45',
    'max-width: 300px',
    'z-index: 9999',
    'pointer-events: none',
    'box-shadow: 0 4px 16px rgba(0,0,0,0.45)',
    'border: 1px solid rgba(255,255,255,0.12)',
    'opacity: 0',
    'transform: translateY(-2px)',
    'transition: opacity .15s ease, transform .15s ease',
    'white-space: pre-line',
  ].join(';');
  document.body.appendChild(el);
  return el;
}

function position(target) {
  const tt = el.getBoundingClientRect();
  const r  = target.getBoundingClientRect();
  const margin = 8;
  let top  = r.bottom + margin;
  let left = r.left + r.width / 2 - tt.width / 2;
  // Wenn unten kein Platz: oberhalb anzeigen
  if (top + tt.height > window.innerHeight - margin) {
    top = r.top - tt.height - margin;
  }
  // Horizontal innerhalb des Viewports halten
  left = Math.max(margin, Math.min(left, window.innerWidth - tt.width - margin));
  el.style.top  = top + 'px';
  el.style.left = left + 'px';
}

function show(target, text) {
  if (!text) return;
  const node = createTooltipEl();
  node.textContent = text;
  currentTarget = target;
  // Erst sichtbar machen, dann positionieren (Groesse muss bekannt sein)
  node.style.visibility = 'hidden';
  node.style.opacity = '0';
  requestAnimationFrame(() => {
    position(target);
    node.style.visibility = 'visible';
    node.style.opacity    = '1';
    node.style.transform  = 'translateY(0)';
  });
}

function hide() {
  if (!el) return;
  el.style.opacity   = '0';
  el.style.transform = 'translateY(-2px)';
  currentTarget = null;
}

export const tooltipDirective = {
  mounted(node, binding) {
    if (!binding.value) return;
    node.__tt_text = binding.value;
    node.__tt_show = () => show(node, node.__tt_text);
    node.__tt_hide = () => hide();
    node.addEventListener('mouseenter', node.__tt_show);
    node.addEventListener('mouseleave', node.__tt_hide);
    node.addEventListener('focus',      node.__tt_show);
    node.addEventListener('blur',       node.__tt_hide);
    // Beim Scrollen Position aktualisieren
    node.__tt_scroll = () => { if (currentTarget === node) position(node); };
    window.addEventListener('scroll', node.__tt_scroll, true);
  },
  updated(node, binding) { node.__tt_text = binding.value; },
  beforeUnmount(node) {
    if (!node.__tt_show) return;
    node.removeEventListener('mouseenter', node.__tt_show);
    node.removeEventListener('mouseleave', node.__tt_hide);
    node.removeEventListener('focus',      node.__tt_show);
    node.removeEventListener('blur',       node.__tt_hide);
    window.removeEventListener('scroll',   node.__tt_scroll, true);
    if (currentTarget === node) hide();
  },
};

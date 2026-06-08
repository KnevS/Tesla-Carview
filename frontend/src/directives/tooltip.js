// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
// Globale v-tooltip Direktive
// Erzeugt einen einzelnen, geteilten Tooltip-DOM-Knoten,
// positioniert ihn unter dem Ziel-Element und blendet ihn ein/aus.
//
// Eingaben:
//   Maus/Stift  → pointerenter (show) / pointerleave (hide)
//   Tastatur    → focus (show) / blur (hide)
//   Touch       → tap toggelt; ausserhalb tap schliesst; Auto-Hide nach 4s
//                 (Tesla-Fahrzeug-Browser feuert kein mouseleave nach Tap)

let el = null;
let currentTarget = null;
let autoHideTimer = null;
let docDismissListener = null;

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
  if (top + tt.height > window.innerHeight - margin) {
    top = r.top - tt.height - margin;
  }
  left = Math.max(margin, Math.min(left, window.innerWidth - tt.width - margin));
  el.style.top  = top + 'px';
  el.style.left = left + 'px';
}

function clearTouchDismiss() {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
  if (docDismissListener) {
    document.removeEventListener('pointerdown', docDismissListener, true);
    docDismissListener = null;
  }
}

function armTouchDismiss(target) {
  clearTouchDismiss();
  autoHideTimer = setTimeout(hide, 4000);
  docDismissListener = (ev) => {
    if (!target.contains(ev.target)) hide();
  };
  // capture-phase, damit wir vor anderen Handlern dismissen
  document.addEventListener('pointerdown', docDismissListener, true);
}

function show(target, text) {
  if (!text) return;
  const node = createTooltipEl();
  node.textContent = text;
  currentTarget = target;
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
  clearTouchDismiss();
  if (!el) return;
  el.style.opacity   = '0';
  el.style.transform = 'translateY(-2px)';
  currentTarget = null;
}

function isTouchLike(e) {
  return e && (e.pointerType === 'touch' || e.pointerType === 'pen');
}

export const tooltipDirective = {
  mounted(node, binding) {
    if (!binding.value) return;
    node.__tt_text = binding.value;

    node.__tt_pointerenter = (e) => {
      if (isTouchLike(e)) return;
      show(node, node.__tt_text);
    };
    node.__tt_pointerleave = (e) => {
      if (isTouchLike(e)) return;
      if (currentTarget === node) hide();
    };
    node.__tt_pointerdown = (e) => {
      if (!isTouchLike(e)) return;
      if (currentTarget === node) {
        hide();
      } else {
        show(node, node.__tt_text);
        armTouchDismiss(node);
      }
    };
    node.__tt_focus = () => show(node, node.__tt_text);
    node.__tt_blur  = () => { if (currentTarget === node) hide(); };

    node.addEventListener('pointerenter', node.__tt_pointerenter);
    node.addEventListener('pointerleave', node.__tt_pointerleave);
    node.addEventListener('pointerdown',  node.__tt_pointerdown);
    node.addEventListener('focus',        node.__tt_focus);
    node.addEventListener('blur',         node.__tt_blur);

    node.__tt_scroll = () => { if (currentTarget === node) position(node); };
    window.addEventListener('scroll', node.__tt_scroll, true);
  },
  updated(node, binding) { node.__tt_text = binding.value; },
  beforeUnmount(node) {
    if (!node.__tt_pointerenter) return;
    node.removeEventListener('pointerenter', node.__tt_pointerenter);
    node.removeEventListener('pointerleave', node.__tt_pointerleave);
    node.removeEventListener('pointerdown',  node.__tt_pointerdown);
    node.removeEventListener('focus',        node.__tt_focus);
    node.removeEventListener('blur',         node.__tt_blur);
    window.removeEventListener('scroll',     node.__tt_scroll, true);
    if (currentTarget === node) hide();
  },
};

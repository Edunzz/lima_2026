/**
 * app.js — Orquestación de la guía del Lab Lima 2026.
 *
 * Fuente de verdad: ./steps.md. Esta app solo lo descarga, lo parsea con la
 * gramática de parser.js, dibuja el flujo (flow.js) y renderiza la sección
 * activa. Para añadir un paso basta con añadir un `##` a steps.md.
 */

import { parseSteps } from './parser.js';
import { Flow } from './flow.js';
import * as progress from './progress.js';

const REPO_URL = 'https://github.com/Edunzz/lima_2026';
const STEPS_URL = './steps.md';
const POLL_MS = 5000;
const AUTORELOAD_KEY = 'lima2026:autoreload:v1';
const SPLIT_KEY = 'lima2026:split:v1';
const SPLIT_DEFAULT = 62;
const SPLIT_MIN = 28;
const SPLIT_MAX = 80;

const $ = (id) => document.getElementById(id);

const el = {
  labTitle: $('labTitle'),
  sectionTitle: $('sectionTitle'),
  progressBar: $('progressBar'),
  progressLabel: $('progressLabel'),
  autoReload: $('autoReload'),
  resetProgress: $('resetProgress'),
  topbarLinks: $('topbarLinks'),
  flowNodes: $('flowNodes'),
  flowLinks: $('flowLinks'),
  layout: document.querySelector('.layout'),
  splitter: $('splitter'),
  panel: $('panel'),
  panelBody: $('panelBody'),
  panelTitle: $('panelTitle'),
  panelContent: $('panelContent'),
  panelFooter: $('panelFooter'),
  prevBtn: $('prevBtn'),
  nextBtn: $('nextBtn'),
  completeBtn: $('completeBtn'),
  lightbox: $('lightbox'),
  lightboxImg: $('lightboxImg'),
};

/** @type {{title:string,start:object|null,links:Array,preamble:string,sections:Array}} */
let doc = { title: '', start: null, links: [], preamble: '', sections: [] };
let activeId = null;
let signature = null;
let pollTimer = null;

const flow = new Flow({
  nodesEl: el.flowNodes,
  svgEl: el.flowLinks,
  repoUrl: REPO_URL,
  onSelect: (id) => goTo(id, { push: true }),
});

// ───────────────────────────── Markdown ──────────────────────────────────

function librariesReady() {
  return typeof window.marked !== 'undefined' && typeof window.DOMPurify !== 'undefined';
}

function renderMarkdown(md) {
  if (!librariesReady()) {
    const pre = document.createElement('pre');
    pre.className = 'fallback-md';
    pre.textContent = md;
    return pre.outerHTML;
  }
  // breaks:true → un salto de línea simple en steps.md se ve como salto de
  // línea en la guía, que es lo que espera quien edita el archivo a mano.
  const raw = window.marked.parse(md, { gfm: true, breaks: true, mangle: false, headerIds: false });
  return window.DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel', 'loading'] });
}

/** Post-proceso del HTML ya insertado: resaltado, copiar, imágenes y enlaces. */
function enhance(container) {
  container.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement;
    const lang = (code.className.match(/language-([\w-]+)/) || [])[1];

    if (window.hljs && lang && window.hljs.getLanguage(lang)) {
      try {
        window.hljs.highlightElement(code);
      } catch {
        /* el resaltado es cosmético: nunca debe romper el render */
      }
    }

    const wrap = document.createElement('div');
    wrap.className = 'codeblock';
    pre.replaceWith(wrap);
    wrap.appendChild(pre);

    if (lang) {
      const tag = document.createElement('span');
      tag.className = 'codeblock__lang';
      tag.textContent = lang;
      wrap.appendChild(tag);
    }

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'codeblock__copy';
    copy.textContent = 'Copiar';
    copy.addEventListener('click', async () => {
      const text = code.textContent;
      let done = false;
      try {
        await navigator.clipboard.writeText(text);
        done = true;
      } catch {
        done = legacyCopy(text);
      }
      copy.textContent = done ? '¡Copiado!' : 'Copia manual';
      copy.classList.toggle('is-done', done);
      setTimeout(() => {
        copy.textContent = 'Copiar';
        copy.classList.remove('is-done');
      }, 1500);
    });
    wrap.appendChild(copy);
  });

  container.querySelectorAll('img').forEach((img) => {
    img.setAttribute('loading', 'lazy');
    img.addEventListener('click', () => openLightbox(img));
  });

  container.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (/^https?:/i.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });

  container.querySelectorAll('table').forEach((table) => {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.replaceWith(wrap);
    wrap.appendChild(table);
  });
}

function legacyCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ──────────────── Enlaces de la barra superior (sección `## Links`) ───────

function renderTopbarLinks(links) {
  el.topbarLinks.textContent = '';
  (links || []).forEach((link) => {
    if (!/^https?:\/\//i.test(link.url)) return;   // solo http(s)
    const a = document.createElement('a');
    a.className = 'chip' + (link.highlight ? ' chip--highlight' : '');
    a.href = link.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = link.label;
    a.title = 'Abrir ' + link.url + ' en una pestaña nueva';
    el.topbarLinks.appendChild(a);
  });
}

// ───────────────────────────── Divisor arrastrable ───────────────────────

function applySplit(pct, { persist = true } = {}) {
  const value = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct));
  el.layout.style.setProperty('--split', value + '%');
  el.splitter.setAttribute('aria-valuenow', String(Math.round(value)));
  if (persist) {
    try {
      localStorage.setItem(SPLIT_KEY, String(value));
    } catch {
      /* noop */
    }
  }
  flow.relayout();
  return value;
}

function splitFromEvent(ev) {
  const rect = el.layout.getBoundingClientRect();
  if (!rect.width) return SPLIT_DEFAULT;
  return ((ev.clientX - rect.left) / rect.width) * 100;
}

function initSplitter() {
  let saved = NaN;
  try {
    saved = parseFloat(localStorage.getItem(SPLIT_KEY));
  } catch {
    /* noop */
  }
  applySplit(Number.isFinite(saved) ? saved : SPLIT_DEFAULT, { persist: false });

  const stacked = () => window.matchMedia('(max-width: 1024px)').matches;

  el.splitter.addEventListener('pointerdown', (ev) => {
    if (stacked() || ev.button !== 0) return;
    ev.preventDefault();
    el.splitter.setPointerCapture(ev.pointerId);
    document.body.classList.add('is-resizing');

    const onMove = (e) => applySplit(splitFromEvent(e), { persist: false });
    const onUp = (e) => {
      el.splitter.removeEventListener('pointermove', onMove);
      el.splitter.removeEventListener('pointerup', onUp);
      el.splitter.removeEventListener('pointercancel', onUp);
      document.body.classList.remove('is-resizing');
      try {
        el.splitter.releasePointerCapture(ev.pointerId);
      } catch {
        /* el puntero ya se liberó */
      }
      applySplit(splitFromEvent(e));
    };

    el.splitter.addEventListener('pointermove', onMove);
    el.splitter.addEventListener('pointerup', onUp);
    el.splitter.addEventListener('pointercancel', onUp);
  });

  // Doble clic: vuelve al reparto por defecto.
  el.splitter.addEventListener('dblclick', () => applySplit(SPLIT_DEFAULT));

  // Teclado: el divisor es un separator accesible.
  el.splitter.addEventListener('keydown', (ev) => {
    const current = parseFloat(el.splitter.getAttribute('aria-valuenow')) || SPLIT_DEFAULT;
    if (ev.key === 'ArrowLeft') applySplit(current - 2);
    else if (ev.key === 'ArrowRight') applySplit(current + 2);
    else if (ev.key === 'Home' || ev.key === 'Enter') applySplit(SPLIT_DEFAULT);
    else return;
    ev.preventDefault();
    ev.stopPropagation();
  });
}

// ───────────────────────────── Lightbox ──────────────────────────────────

function openLightbox(img) {
  el.lightboxImg.src = img.currentSrc || img.src;
  el.lightboxImg.alt = img.alt || '';
  el.lightbox.hidden = false;
  el.lightbox.focus();
}

function closeLightbox() {
  el.lightbox.hidden = true;
  el.lightboxImg.removeAttribute('src');
}

// ───────────────────────────── Render ────────────────────────────────────

function sectionIndex(id) {
  return doc.sections.findIndex((s) => s.id === id);
}

function goTo(id, { push = false, scroll = true } = {}) {
  if (!doc.sections.length) return;
  const idx = Math.max(0, sectionIndex(id));
  const section = doc.sections[idx];
  activeId = section.id;

  el.sectionTitle.textContent = section.title;
  el.panelTitle.textContent = section.title;

  const body = idx === 0 && doc.preamble ? doc.preamble + '\n\n' + section.body : section.body;
  el.panelContent.innerHTML = renderMarkdown(body);
  enhance(el.panelContent);

  flow.setActive(section.id);
  flow.scrollIntoView(section.id);

  el.prevBtn.disabled = idx === 0;
  el.nextBtn.disabled = idx === doc.sections.length - 1;
  updateCompleteBtn();
  updateProgress();

  // La URL siempre refleja lo que se está viendo (también tras editar steps.md).
  const hash = '#' + section.id;
  if (location.hash !== hash) {
    if (push) history.pushState({ id: section.id }, '', hash);
    else history.replaceState({ id: section.id }, '', hash);
  }

  if (scroll) el.panelBody.scrollTop = 0;
}

function updateCompleteBtn() {
  const done = progress.isDone(activeId);
  el.completeBtn.textContent = done ? 'Completado ✓ — desmarcar' : 'Marcar como completado';
  el.completeBtn.classList.toggle('btn--done', done);
  el.completeBtn.setAttribute('aria-pressed', String(done));
}

function updateProgress() {
  const ids = doc.sections.map((s) => s.id);
  const total = ids.length;
  const done = progress.countDone(ids);
  const pct = total ? Math.round((done / total) * 100) : 0;
  el.progressBar.style.width = pct + '%';
  el.progressLabel.textContent = done + '/' + total;
  el.progressBar.parentElement.setAttribute('aria-valuenow', String(pct));
}

function renderDoc(parsed, { keepActive = null } = {}) {
  // Posición previa: si al editar steps.md se renombra o borra la sección que
  // se estaba leyendo, nos quedamos donde estábamos en vez de saltar al inicio.
  const prevIndex = keepActive ? sectionIndex(keepActive) : -1;
  doc = parsed;
  const ids = doc.sections.map((s) => s.id);
  const done = progress.prune(ids);

  const title = doc.title || 'Guía de laboratorio';
  el.labTitle.textContent = title;
  document.title = title;

  renderTopbarLinks(doc.links);
  flow.render(doc, done);

  if (!doc.sections.length) {
    el.sectionTitle.textContent = '';
    el.panelTitle.textContent = 'No hay pasos que mostrar';
    el.panelContent.innerHTML =
      '<p>El archivo <code>docs/steps.md</code> no contiene ninguna sección <code>##</code>. ' +
      'Añade al menos una y recarga la página.</p>';
    el.panelFooter.hidden = true;
    updateProgress();
    return;
  }

  el.panelFooter.hidden = false;
  const fromHash = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  const wanted = [keepActive, fromHash].find((id) => id && sectionIndex(id) >= 0);
  const fallbackIndex = prevIndex >= 0 ? Math.min(prevIndex, doc.sections.length - 1) : 0;
  goTo(wanted || doc.sections[fallbackIndex].id, { push: false });
}

function renderError(message, detail) {
  el.labTitle.textContent = 'Guía de laboratorio';
  el.panelTitle.textContent = 'No se pudo cargar la guía';
  el.panelContent.innerHTML =
    '<div class="notice notice--error"><p>' + message + '</p>' +
    (detail ? '<pre>' + detail + '</pre>' : '') + '</div>';
  el.panelFooter.hidden = true;
}

// ───────────────────────────── Carga y auto-recarga ──────────────────────

function fingerprint(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return text.length + ':' + h;
}

/**
 * Descarga steps.md sin caché y calcula su firma (ETag/Last-Modified si el
 * servidor los envía; si no, un hash del texto). Una sola petición GET sirve
 * para detectar el cambio y para aplicarlo.
 */
async function fetchSteps() {
  const res = await fetch(STEPS_URL + '?t=' + Date.now(), { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  const text = await res.text();
  const tag = res.headers.get('ETag') || res.headers.get('Last-Modified');
  return { text, signature: tag ? 'meta:' + tag : 'hash:' + fingerprint(text) };
}

async function load({ keepActive = null } = {}) {
  if (location.protocol === 'file:') {
    renderError(
      'Abre la guía con un servidor local: <code>python3 -m http.server 8000 --directory docs</code> ' +
      'y visita <a href="http://localhost:8000">http://localhost:8000</a>.',
      'El navegador bloquea fetch() sobre file:// por seguridad (CORS).'
    );
    return;
  }
  try {
    const fetched = await fetchSteps();
    signature = fetched.signature;
    renderDoc(parseSteps(fetched.text), { keepActive });
  } catch (err) {
    renderError(
      'No se pudo leer <code>steps.md</code>. Si abriste el archivo directamente, ' +
      'sírvelo con <code>python3 -m http.server 8000 --directory docs</code> y entra a ' +
      '<a href="http://localhost:8000">http://localhost:8000</a>.',
      String((err && err.message) || err)
    );
  }
}

/**
 * Un ciclo de auto-recarga: si la firma de steps.md cambió, re-renderiza
 * conservando la sección activa y el progreso. Los errores de red se ignoran
 * en silencio: es un sondeo de fondo, no debe molestar durante el lab.
 */
async function pollOnce() {
  let fetched;
  try {
    fetched = await fetchSteps();
  } catch {
    return;
  }
  if (signature === null || fetched.signature === signature) return;
  signature = fetched.signature;
  renderDoc(parseSteps(fetched.text), { keepActive: activeId });
}

function setAutoReload(enabled, { persist = true } = {}) {
  el.autoReload.checked = enabled;
  if (persist) {
    try {
      localStorage.setItem(AUTORELOAD_KEY, enabled ? '1' : '0');
    } catch {
      /* noop */
    }
  }
  clearInterval(pollTimer);
  pollTimer = null;
  if (!enabled) return;
  pollTimer = setInterval(() => {
    if (!document.hidden) pollOnce();
  }, POLL_MS);
}

function autoReloadDefault() {
  try {
    const saved = localStorage.getItem(AUTORELOAD_KEY);
    if (saved !== null) return saved === '1';
  } catch {
    /* noop */
  }
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
}

// ───────────────────────────── Eventos ───────────────────────────────────

el.prevBtn.addEventListener('click', () => {
  const i = sectionIndex(activeId);
  if (i > 0) goTo(doc.sections[i - 1].id, { push: true });
});

el.nextBtn.addEventListener('click', () => {
  const i = sectionIndex(activeId);
  if (i >= 0 && i < doc.sections.length - 1) goTo(doc.sections[i + 1].id, { push: true });
});

el.completeBtn.addEventListener('click', () => {
  const nowDone = progress.toggle(activeId);
  flow.setDone(activeId, nowDone);
  updateCompleteBtn();
  updateProgress();

  if (nowDone) {
    const i = sectionIndex(activeId);
    if (i >= 0 && i < doc.sections.length - 1) goTo(doc.sections[i + 1].id, { push: true });
  }
});

el.resetProgress.addEventListener('click', () => {
  if (!confirm('¿Reiniciar el progreso del laboratorio? Se desmarcarán todos los pasos.')) return;
  progress.reset();
  doc.sections.forEach((s) => flow.setDone(s.id, false));
  updateCompleteBtn();
  updateProgress();
});

el.autoReload.addEventListener('change', () => setAutoReload(el.autoReload.checked));

window.addEventListener('popstate', () => {
  const id = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if (id && sectionIndex(id) >= 0) goTo(id, { push: false });
});

document.addEventListener('keydown', (ev) => {
  if (!el.lightbox.hidden && ev.key === 'Escape') {
    closeLightbox();
    return;
  }
  if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
  const tag = (ev.target && ev.target.tagName) || '';
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) || (ev.target && ev.target.isContentEditable)) return;

  if (ev.key === 'ArrowRight') el.nextBtn.click();
  else if (ev.key === 'ArrowLeft') el.prevBtn.click();
});

el.lightbox.addEventListener('click', closeLightbox);

// ───────────────────────────── Arranque ──────────────────────────────────

initSplitter();
load().then(() => setAutoReload(autoReloadDefault(), { persist: false }));

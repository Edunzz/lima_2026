/**
 * flow.js — Panel izquierdo: el flujo de pasos.
 *
 * Coloca los nodos en filas (3 por fila en escritorio) con recorrido tipo
 * serpiente — la fila 0 va de izquierda a derecha, la fila 1 de derecha a
 * izquierda, etc. — y dibuja los conectores en un SVG generado a partir de la
 * posición real de cada nodo (getBoundingClientRect).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export class Flow {
  /**
   * @param {{nodesEl:HTMLElement, svgEl:SVGSVGElement, repoUrl:string,
   *          onSelect:(id:string)=>void}} opts
   */
  constructor({ nodesEl, svgEl, repoUrl, onSelect }) {
    this.nodesEl = nodesEl;
    this.svgEl = svgEl;
    this.repoUrl = repoUrl;
    this.onSelect = onSelect;
    /** @type {Map<string, HTMLElement>} */
    this.nodeById = new Map();
    /** @type {HTMLElement[]} */
    this.items = [];
    this.activeId = null;

    this.relayout = this.relayout.bind(this);
    window.addEventListener('resize', this.relayout, { passive: true });
    if ('ResizeObserver' in window) {
      this._ro = new ResizeObserver(() => this.relayout());
      this._ro.observe(this.nodesEl);
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.relayout()).catch(() => {});
    }
  }

  /**
   * Reconstruye el flujo completo.
   * @param {{start:{label:string}|null, sections:Array<{id:string,title:string}>}} doc
   * @param {Record<string, true>} done
   */
  render(doc, done = {}) {
    this.nodesEl.textContent = '';
    this.nodeById.clear();
    this.items = [];

    // Nodo de inicio (círculo verde). Solo si steps.md trae la línea `inicio:`.
    if (doc.start && doc.start.label) {
      const startEl = document.createElement('a');
      startEl.className = 'node node--start';
      startEl.href = this.repoUrl;
      startEl.target = '_blank';
      startEl.rel = 'noopener noreferrer';
      startEl.title = 'Abrir ' + this.repoUrl;
      const label = document.createElement('span');
      label.className = 'node__label';
      label.textContent = doc.start.label;
      startEl.appendChild(label);
      this.nodesEl.appendChild(startEl);
      this.items.push(startEl);
    }

    doc.sections.forEach((section, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'node node--step';
      btn.dataset.id = section.id;

      const num = document.createElement('span');
      num.className = 'node__index';
      num.textContent = String(index + 1);

      const label = document.createElement('span');
      label.className = 'node__label';
      label.textContent = section.title;

      const check = document.createElement('span');
      check.className = 'node__check';
      check.setAttribute('aria-hidden', 'true');

      btn.append(num, label, check);
      btn.addEventListener('click', () => this.onSelect(section.id));

      this.nodesEl.appendChild(btn);
      this.nodeById.set(section.id, btn);
      this.items.push(btn);
      this.setDone(section.id, done[section.id] === true);
    });

    this.relayout();
  }

  /** Nº de columnas real, leído del grid resuelto por CSS (respeta media queries). */
  columns() {
    const tpl = getComputedStyle(this.nodesEl).gridTemplateColumns || '';
    const tracks = tpl.split(' ').filter((t) => t && t !== 'none');
    return Math.max(1, tracks.length);
  }

  /** Asigna fila/columna en serpiente y redibuja los conectores. */
  relayout() {
    if (!this.items.length) {
      this.svgEl.textContent = '';
      return;
    }
    const cols = this.columns();

    this.items.forEach((el, k) => {
      const row = Math.floor(k / cols);
      const inRow = k % cols;
      const col = row % 2 === 0 ? inRow : cols - 1 - inRow;
      el.style.gridRow = String(row + 1);
      el.style.gridColumn = String(col + 1);
      el.dataset.row = String(row);
    });

    // El navegador necesita haber aplicado el grid antes de medir.
    requestAnimationFrame(() => this.drawLinks());
  }

  drawLinks() {
    const svg = this.svgEl;
    svg.textContent = '';
    if (this.items.length < 2) return;

    const box = this.nodesEl.getBoundingClientRect();
    if (!box.width || !box.height) return;
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    svg.setAttribute('width', String(box.width));
    svg.setAttribute('height', String(box.height));

    svg.appendChild(this.arrowDefs());

    const rel = (el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left - box.left,
        right: r.right - box.left,
        top: r.top - box.top,
        bottom: r.bottom - box.top,
        cx: r.left - box.left + r.width / 2,
        cy: r.top - box.top + r.height / 2,
      };
    };

    const GAP = 6; // holgura entre el borde del nodo y la punta de la flecha

    for (let k = 0; k < this.items.length - 1; k++) {
      const a = rel(this.items[k]);
      const b = rel(this.items[k + 1]);
      const sameRow = this.items[k].dataset.row === this.items[k + 1].dataset.row;
      let d;

      if (sameRow) {
        const leftToRight = b.cx > a.cx;
        const x1 = leftToRight ? a.right + GAP : a.left - GAP;
        const x2 = leftToRight ? b.left - GAP : b.right + GAP;
        const y = (a.cy + b.cy) / 2;
        d = 'M ' + x1 + ' ' + y + ' L ' + x2 + ' ' + y;
      } else {
        // Cambio de fila: en serpiente el siguiente nodo queda justo debajo.
        const y1 = a.bottom + GAP;
        const y2 = b.top - GAP;
        const midY = (y1 + y2) / 2;
        d =
          Math.abs(b.cx - a.cx) < 2
            ? 'M ' + a.cx + ' ' + y1 + ' L ' + b.cx + ' ' + y2
            : 'M ' + a.cx + ' ' + y1 + ' L ' + a.cx + ' ' + midY + ' L ' + b.cx + ' ' + midY + ' L ' + b.cx + ' ' + y2;
      }

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'flow__link');
      path.setAttribute('marker-end', 'url(#flow-arrow)');
      svg.appendChild(path);
    }
  }

  arrowDefs() {
    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', 'flow-arrow');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const head = document.createElementNS(SVG_NS, 'path');
    head.setAttribute('d', 'M 0 1 L 10 5 L 0 9 z');
    head.setAttribute('class', 'flow__arrow');
    marker.appendChild(head);
    defs.appendChild(marker);
    return defs;
  }

  setActive(id) {
    this.activeId = id;
    this.nodeById.forEach((el, nodeId) => {
      const active = nodeId === id;
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    });
  }

  setDone(id, done) {
    const el = this.nodeById.get(id);
    if (!el) return;
    el.classList.toggle('is-done', !!done);
    const label = el.querySelector('.node__label');
    const text = label ? label.textContent : id;
    el.setAttribute('aria-label', text + ' — ' + (done ? 'completado' : 'pendiente'));
  }

  /** Lleva el nodo activo a la vista si el panel del flujo tiene scroll. */
  scrollIntoView(id) {
    const el = this.nodeById.get(id);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }
}

export default Flow;

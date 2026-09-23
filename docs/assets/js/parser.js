/**
 * parser.js — Gramática de `steps.md`.
 *
 *   # {título del laboratorio}
 *   inicio: {etiqueta del nodo verde}      ← línea OPCIONAL
 *
 *   ## {título de la sección}
 *   {markdown libre}
 *
 * Reglas implementadas:
 *  1. El primer H1 es el título del lab.
 *  2. Si la primera línea no vacía tras el H1 empieza por `inicio:` (sin importar
 *     mayúsculas ni espacios), su texto es la etiqueta del nodo de inicio.
 *  3. Cada H2 abre una sección = un nodo del flujo.
 *  4. Los encabezados H3+ quedan dentro del contenido de su sección.
 *  5. Los `#`/`##` dentro de un bloque de código se ignoran (pre-escaneo de fences).
 *  6. El id de sección es el slug del título (usado en el hash de la URL).
 */

/** Slug estable: minúsculas, sin acentos, sin signos, espacios → «-». */
export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'seccion';
}

/**
 * Marca las líneas que pertenecen a un bloque de código cercado (``` o ~~~),
 * incluidas las propias líneas de apertura y cierre.
 * @returns {boolean[]} una entrada por línea; true = ignorar para encabezados.
 */
function maskFences(lines) {
  const masked = new Array(lines.length).fill(false);
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!open) {
      if (!m) continue;
      // En una cerca de backticks el «info string» no puede contener backticks.
      if (m[1][0] === '`' && m[2].includes('`')) continue;
      open = { char: m[1][0], len: m[1].length };
      masked[i] = true;
    } else {
      masked[i] = true;
      const closes = m && m[1][0] === open.char && m[1].length >= open.len && m[2].trim() === '';
      if (closes) open = null;
    }
  }
  return masked;
}

/** Quita líneas en blanco al principio y al final, conservando el interior. */
function trimBlankLines(lines) {
  let a = 0;
  let b = lines.length;
  while (a < b && lines[a].trim() === '') a++;
  while (b > a && lines[b - 1].trim() === '') b--;
  return lines.slice(a, b).join('\n');
}

/**
 * @param {string} markdown contenido de steps.md
 * @returns {{title:string, start:{label:string}|null, preamble:string,
 *            sections:Array<{id:string,title:string,body:string}>}}
 */
export function parseSteps(markdown) {
  const src = String(markdown == null ? '' : markdown)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
  const lines = src.split('\n');
  const masked = maskFences(lines);

  const isH1 = (i) => !masked[i] && /^ {0,3}#[ \t]+\S/.test(lines[i]);
  const isH2 = (i) => !masked[i] && /^ {0,3}##[ \t]+\S/.test(lines[i]);
  const headingText = (line) => line.replace(/^ {0,3}#{1,6}[ \t]+/, '').replace(/[ \t]+#*[ \t]*$/, '').trim();

  // ── 1. Título (primer H1) ────────────────────────────────────────────────
  let title = '';
  let cursor = 0;
  for (let i = 0; i < lines.length; i++) {
    if (isH2(i)) break;            // el documento empieza directamente en secciones
    if (isH1(i)) {
      title = headingText(lines[i]);
      cursor = i + 1;
      break;
    }
  }

  // ── 2. Línea `inicio:` (opcional, primera no vacía tras el H1) ───────────
  let start = null;
  for (let i = cursor; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    if (isH2(i)) break;
    const m = masked[i] ? null : lines[i].match(/^\s*inicio\s*:\s*(.*)$/i);
    if (m && m[1].trim() !== '') {
      start = { label: m[1].trim() };
      cursor = i + 1;
    }
    break;                          // solo se evalúa la primera línea no vacía
  }

  // ── 3. Secciones (un H2 = un nodo) ───────────────────────────────────────
  const sections = [];
  const used = new Map();
  let preambleLines = [];
  let current = null;

  for (let i = cursor; i < lines.length; i++) {
    if (isH2(i)) {
      if (current) sections.push(current);
      const text = headingText(lines[i]);
      let id = slugify(text);
      if (used.has(id)) {
        const n = used.get(id) + 1;
        used.set(id, n);
        id = `${id}-${n}`;
      } else {
        used.set(id, 1);
      }
      current = { id, title: text, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(lines[i]);
    } else {
      preambleLines.push(lines[i]);
    }
  }
  if (current) sections.push(current);

  const preamble = trimBlankLines(preambleLines);

  return {
    title,
    start,
    preamble,
    sections: sections.map((s) => ({ id: s.id, title: s.title, body: trimBlankLines(s.bodyLines) })),
  };
}

export default parseSteps;

/**
 * progress.js — Progreso del laboratorio persistido en localStorage.
 * Clave: lima2026:progress:v1  →  { "<slug>": true, … }
 *
 * Todo acceso va envuelto en try/catch: en modo privado o con el almacenamiento
 * bloqueado la guía debe seguir funcionando (solo se pierde la persistencia).
 */

export const STORAGE_KEY = 'lima2026:progress:v1';

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean = {};
    for (const [k, v] of Object.entries(parsed)) if (v === true) clean[k] = true;
    return clean;
  } catch {
    return {};
  }
}

function write(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* sin persistencia: el progreso vive solo en memoria durante la sesión */
  }
}

/** @returns {Record<string, true>} copia del estado actual */
export function all() {
  return read();
}

export function isDone(id) {
  return read()[id] === true;
}

/** Marca o desmarca una sección. @returns {boolean} nuevo estado */
export function setDone(id, done) {
  const state = read();
  if (done) state[id] = true;
  else delete state[id];
  write(state);
  return done === true;
}

/** Alterna una sección. @returns {boolean} nuevo estado */
export function toggle(id) {
  return setDone(id, !isDone(id));
}

export function reset() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Cuántas de `ids` están completadas (ignora slugs desconocidos). */
export function countDone(ids) {
  const state = read();
  return ids.reduce((n, id) => n + (state[id] === true ? 1 : 0), 0);
}

/**
 * Descarta slugs que ya no existen en steps.md (el usuario pudo renombrar o
 * borrar secciones). No rompe nada: simplemente limpia el almacenamiento.
 */
export function prune(validIds) {
  const valid = new Set(validIds);
  const state = read();
  let changed = false;
  for (const id of Object.keys(state)) {
    if (!valid.has(id)) {
      delete state[id];
      changed = true;
    }
  }
  if (changed) write(state);
  return state;
}

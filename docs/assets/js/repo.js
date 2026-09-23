/**
 * repo.js — De qué repositorio es esta copia de la guía.
 *
 * El objetivo es que un fork funcione sin editar código: los enlaces deben
 * apuntar al repositorio de quien lo clonó, no al original. Se resuelve por
 * orden de prioridad:
 *
 *   1. La línea `repo: usuario/nombre` de steps.md (si está).
 *   2. La propia URL, cuando se sirve desde GitHub Pages
 *      (`https://usuario.github.io/nombre/` → `usuario/nombre`).
 *   3. El valor por defecto (útil en local, donde la URL no dice nada).
 *
 * Son funciones puras: reciben hostname/pathname/texto y no tocan el DOM.
 */

/** Formato `usuario/nombre-del-repo`. */
const SLUG_RE = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;

/**
 * Deduce `usuario/repo` de una URL de GitHub Pages.
 * @param {string} hostname p. ej. "edunzz.github.io"
 * @param {string} pathname p. ej. "/lima_2026/"
 * @returns {string|null} "edunzz/lima_2026", o null si no es GitHub Pages
 */
export function repoFromHost(hostname, pathname) {
  const host = String(hostname || '').toLowerCase();
  const m = host.match(/^([a-z0-9-]+)\.github\.io$/);
  if (!m) return null;                       // local, Codespaces, dominio propio…

  const owner = m[1];
  const first = String(pathname || '').split('/').filter(Boolean)[0] || '';

  // Sitio de usuario (usuario.github.io) vs. sitio de proyecto (…/repo/).
  const name = !first || /\.\w+$/.test(first) ? owner + '.github.io' : first;
  return owner + '/' + name;
}

/**
 * Lee la línea `repo:` de la cabecera de steps.md, si existe.
 * Solo mira las primeras líneas: es un metadato de cabecera, como `inicio:`.
 */
export function repoFromDoc(text) {
  const head = String(text || '').replace(/\r\n?/g, '\n').split('\n').slice(0, 12).join('\n');
  const m = head.match(/^[ \t]*repo[ \t]*:[ \t]*(\S+)[ \t]*$/im);
  return m && SLUG_RE.test(m[1]) ? m[1] : null;
}

/**
 * Todo lo derivable del repositorio, listo para sustituir en el markdown.
 * @param {string} slug "usuario/repo"
 */
export function repoContext(slug) {
  // Aquí no se valida ni se corrige: la validación está en repoFromDoc/
  // repoFromHost, que es por donde entra lo que escribe el usuario. Así este
  // módulo no necesita conocer ningún repositorio concreto y un valor raro se
  // ve en pantalla en lugar de apuntar en silencio al repo de otra persona.
  const safe = String(slug || '').trim();
  const [owner = '', name = ''] = safe.split('/');
  return {
    slug: safe,
    owner,
    name,
    url: 'https://github.com/' + safe,
    cloneUrl: 'https://github.com/' + safe + '.git',
    pagesUrl: 'https://' + owner.toLowerCase() + '.github.io/' + name + '/',
    codespacesUrl: 'https://codespaces.new/' + safe + '?quickstart=1',
  };
}

/** Resuelve el repositorio con el orden de prioridad documentado arriba. */
export function resolveRepo(text, location, fallback) {
  return repoContext(
    repoFromDoc(text) ||
    repoFromHost(location && location.hostname, location && location.pathname) ||
    fallback
  );
}

export { SLUG_RE };

const TOKENS = {
  repo_url: 'url',
  repo_clone_url: 'cloneUrl',
  repo_name: 'name',
  repo: 'slug',
  owner: 'owner',
  pages_url: 'pagesUrl',
  codespaces_url: 'codespacesUrl',
};

// Los nombres largos van primero para que `repo_url` no se parta en `repo`.
const TOKEN_RE = new RegExp(
  '\\{\\{\\s*(' + Object.keys(TOKENS).sort((a, b) => b.length - a.length).join('|') + ')\\s*\\}\\}',
  'gi'
);

/**
 * Sustituye los marcadores `{{repo_url}}`, `{{owner}}`… por los valores reales.
 * Un marcador desconocido se deja tal cual, para que se vea el error.
 */
export function applyRepoTokens(text, ctx) {
  return String(text == null ? '' : text).replace(TOKEN_RE, (match, key) => {
    const prop = TOKENS[key.toLowerCase()];
    return prop && ctx && ctx[prop] ? ctx[prop] : match;
  });
}

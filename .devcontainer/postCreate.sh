#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Lab Lima 2026 — post-creación del devcontainer / Codespace
#
# Instala:
#   1. dtctl                      (CLI oficial de Dynatrace)
#   2. Dynatrace Agent Skills dt-* (repo Dynatrace/dynatrace-for-ai)
#
# Es idempotente y TOLERANTE A FALLOS a propósito: sin `set -e`, y siempre
# termina con exit 0 para que el Codespace se cree aunque un instalador falle.
# Los fallos NO se silencian: se imprimen en el resumen final y el README
# documenta cómo resolverlos (sección «Troubleshooting»).
# ---------------------------------------------------------------------------
set -uo pipefail

log()  { echo -e "\n\033[1;36m▶ $*\033[0m"; }
ok()   { echo -e "\033[1;32m✔ $*\033[0m"; }
warn() { echo -e "\033[1;33m⚠ $*\033[0m"; }
err()  { echo -e "\033[1;31m✖ $*\033[0m"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/.github/skills"   # ruta de skills de proyecto que VS Code / Copilot descubre
SKILLS_REPO="Dynatrace/dynatrace-for-ai"
TENANT="https://playground.apps.dynatrace.com"
FAILURES=()

count_skills() { find "${1:-$SKILLS_DIR}" -mindepth 2 -maxdepth 2 -name 'SKILL.md' 2>/dev/null | wc -l | tr -d ' '; }

# ── 1. dtctl ────────────────────────────────────────────────────────────────
log "Instalando dtctl…"
export PATH="$HOME/.local/bin:$PATH"

if command -v dtctl >/dev/null 2>&1; then
  ok "dtctl ya estaba instalado ($(command -v dtctl))"
else
  # Instalador oficial documentado en https://dynatrace-oss.github.io/dtctl
  # (deja el binario en ~/.local/bin en Linux; no requiere sudo).
  curl -fsSL https://raw.githubusercontent.com/dynatrace-oss/dtctl/main/install.sh | sh \
    || warn "El instalador automático de dtctl devolvió error."
fi

if command -v dtctl >/dev/null 2>&1; then
  ok "$(dtctl version 2>/dev/null | head -n1 || echo 'dtctl instalado')"
else
  err "dtctl NO quedó disponible en el PATH."
  FAILURES+=("dtctl no se instaló — ver README > Troubleshooting > «dtctl: command not found»")
fi

# Persistir ~/.local/bin en el PATH de futuras terminales (idempotente).
if ! grep -qs 'HOME/.local/bin' "$HOME/.bashrc" 2>/dev/null; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

# ── 2. Dynatrace Agent Skills (dt-*) ────────────────────────────────────────
log "Instalando Dynatrace Agent Skills (dt-*) en .github/skills…"
mkdir -p "$SKILLS_DIR"

# 2.a Método oficial: el instalador universal de Agent Skills.
if command -v npx >/dev/null 2>&1; then
  ( cd "$REPO_ROOT" && npx --yes skills add "$SKILLS_REPO" --skill '*' --agent github-copilot --copy --yes ) \
    || warn "«npx skills add» devolvió error; se intentará el método manual."
else
  warn "npx no está disponible; se usará el método manual."
fi

# El instalador puede escribir en otra ruta de agente: si es así, consolidamos.
if [ "$(count_skills)" -eq 0 ] && [ -d "$REPO_ROOT/.agents/skills" ]; then
  cp -r "$REPO_ROOT"/.agents/skills/dt-* "$SKILLS_DIR"/ 2>/dev/null \
    && ok "Skills consolidadas desde .agents/skills"
fi

# 2.b Verificación real: el instalador puede reportar éxito sin escribir nada.
if [ "$(count_skills)" -eq 0 ]; then
  warn "No se detectaron skills tras el método oficial. Usando clonado directo del repo…"
  TMP="$(mktemp -d)"
  if git clone --depth 1 --quiet "https://github.com/$SKILLS_REPO" "$TMP/dt-ai"; then
    cp -r "$TMP"/dt-ai/skills/dt-* "$SKILLS_DIR"/ 2>/dev/null \
      && ok "Skills dt-* copiadas en $SKILLS_DIR"
  else
    err "No se pudo clonar https://github.com/$SKILLS_REPO"
  fi
  rm -rf "$TMP"
fi

SKILL_COUNT="$(count_skills)"
if [ "$SKILL_COUNT" -gt 0 ]; then
  ok "$SKILL_COUNT skill(s) dt-* disponibles en .github/skills"
else
  err "NO se instaló ninguna skill dt-*."
  FAILURES+=("skills dt-* no instaladas — ver README > Troubleshooting > «No veo las skills dt-*»")
fi

# ── 3. Resumen ──────────────────────────────────────────────────────────────
log "Resumen del entorno"
echo "  dtctl : $(command -v dtctl || echo 'NO DISPONIBLE')"
echo "  skills: $SKILL_COUNT skill(s) dt-* en .github/skills"
echo "  tenant: $TENANT/"
echo "  guía  : python3 -m http.server 8000 --directory docs   → http://localhost:8000"

echo ""
if [ "${#FAILURES[@]}" -gt 0 ]; then
  err "El entorno se creó, pero con ${#FAILURES[@]} problema(s):"
  for f in "${FAILURES[@]}"; do echo "   - $f"; done
  echo ""
  echo "  El Codespace es usable: puedes reintentar la instalación ejecutando"
  echo "  de nuevo:  bash .devcontainer/postCreate.sh"
else
  ok "Entorno listo."
fi

echo ""
echo "Siguiente paso:"
echo "  dtctl auth login --context lab --environment $TENANT"
echo ""

exit 0

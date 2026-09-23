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
# Clonado superficial del repo oficial: ~4 MB y unos segundos. Se evita a
# propósito «npx skills add», que exigiría instalar Node solo para esto y que
# además copia en .agents/skills aunque se le pida el target de Copilot.
log "Instalando Dynatrace Agent Skills (dt-*) en .github/skills…"
mkdir -p "$SKILLS_DIR"

if [ "$(count_skills)" -eq 0 ]; then
  TMP="$(mktemp -d)"
  if git clone --depth 1 --quiet "https://github.com/$SKILLS_REPO" "$TMP/dt-ai"; then
    cp -r "$TMP"/dt-ai/skills/dt-* "$SKILLS_DIR"/ 2>/dev/null
  else
    err "No se pudo clonar https://github.com/$SKILLS_REPO"
  fi
  rm -rf "$TMP"
else
  ok "Las skills ya estaban instaladas."
fi

SKILL_COUNT="$(count_skills)"
if [ "$SKILL_COUNT" -gt 0 ]; then
  ok "$SKILL_COUNT skill(s) dt-* disponibles en .github/skills"
else
  err "NO se instaló ninguna skill dt-*."
  FAILURES+=("skills dt-* no instaladas — ver README > Troubleshooting > «No veo las skills dt-*»")
fi

# ── Navegador para el login OAuth de dtctl ──────────────────────────────────
# dtctl busca xdg-open / x-www-browser / www-browser en el PATH para abrir el
# SSO. En un contenedor headless no existe ninguno, así que se instala un
# wrapper que delega en el helper de VS Code / Codespaces: ese helper abre el
# navegador REAL del usuario y además traduce http://localhost:<puerto> a la
# URL reenviada, que es lo que hace que el callback vuelva solo.
log "Configurando apertura de navegador para OAuth…"

BROWSER_DIR="/usr/local/bin"
SUDO="sudo"
if ! command -v sudo >/dev/null 2>&1 || ! sudo -n true >/dev/null 2>&1; then
  # Sin sudo (rootless o ejecución fuera del codespace): al PATH del usuario,
  # que ya se añadió más arriba.
  BROWSER_DIR="$HOME/.local/bin"
  SUDO=""
  mkdir -p "$BROWSER_DIR"
fi

$SUDO tee "$BROWSER_DIR/xdg-open" >/dev/null <<'EOF'
#!/usr/bin/env bash
# Abre una URL en el navegador del usuario delegando en los helpers de
# VS Code / Codespaces, que además traducen http://localhost:<puerto> a la
# URL reenviada; eso es lo que hace que el callback de OAuth vuelva solo.
candidatos=()
[ -n "${BROWSER:-}" ] && candidatos+=("$BROWSER")
for helper in /vscode/bin/*/bin/helpers/browser.sh "$HOME"/.vscode-remote/bin/*/bin/helpers/browser.sh; do
  [ -x "$helper" ] && candidatos+=("$helper")
done
command -v gh >/dev/null 2>&1 && candidatos+=("$(command -v gh)")

for b in ${candidatos[@]+"${candidatos[@]}"}; do
  # $BROWSER puede venir como «ruta --flag»: se valida solo el ejecutable y
  # luego se deja sin comillas para que los argumentos se separen.
  bin="${b%% *}"
  [ -n "$bin" ] && [ -x "$bin" ] || continue
  case "$bin" in
    */gh) exec "$bin" browser "$1" ;;
  esac
  exec $b "$1"
done

echo "No se pudo abrir el navegador. Abre este enlace manualmente:"
echo "$1"
EOF

$SUDO chmod +x "$BROWSER_DIR/xdg-open"
$SUDO ln -sf "$BROWSER_DIR/xdg-open" "$BROWSER_DIR/x-www-browser"
$SUDO ln -sf "$BROWSER_DIR/xdg-open" "$BROWSER_DIR/www-browser"

if command -v xdg-open >/dev/null 2>&1; then
  ok "xdg-open configurado ($BROWSER_DIR)"
else
  err "No se pudo instalar el wrapper de xdg-open."
  FAILURES+=("xdg-open no configurado — el login OAuth pedirá abrir la URL a mano")
fi

# ── 3. Resumen ──────────────────────────────────────────────────────────────
log "Resumen del entorno"
echo "  dtctl : $(command -v dtctl || echo 'NO DISPONIBLE')"
echo "  skills: $SKILL_COUNT skill(s) dt-* en .github/skills"
echo "  navegador: $(command -v xdg-open || echo 'NO DISPONIBLE') (abre el SSO)"
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
echo "  dtctl auth login --context lab --environment $TENANT --timeout 10m"
echo ""
echo "  Si usas el Codespace EN EL NAVEGADOR, al volver del SSO caerás en una"
echo "  página de error en http://localhost:3232/... Es lo esperado: cambia solo"
echo "  el host por el del puerto 3232 de la pestaña PORTS y pulsa Enter."
echo "  Con VS Code de escritorio no hace falta: el login se cierra solo."
echo ""

exit 0

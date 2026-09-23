#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Apunta este clon a TU repositorio.
#
# La guía web (docs/) ya detecta sola el repositorio cuando se publica en
# GitHub Pages, así que esto es solo para los archivos estáticos que GitHub
# renderiza tal cual — README.md y AGENTS.md — más la línea `repo:` de
# steps.md, que fija el destino también en local y en Codespaces.
#
#   bash scripts/usar-mi-fork.sh              # deduce el repo de `origin`
#   bash scripts/usar-mi-fork.sh usuario/repo # o se lo dices tú
#
# Es idempotente: puedes ejecutarlo las veces que quieras.
# ---------------------------------------------------------------------------
set -uo pipefail

ok()   { echo -e "\033[1;32m✔ $*\033[0m"; }
warn() { echo -e "\033[1;33m⚠ $*\033[0m"; }
err()  { echo -e "\033[1;31m✖ $*\033[0m"; }

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

DESTINO="${1:-}"
if [ -z "$DESTINO" ]; then
  REMOTO="$(git remote get-url origin 2>/dev/null)"
  if [ -z "$REMOTO" ]; then
    err "No hay remoto 'origin'. Pásame el repo: bash scripts/usar-mi-fork.sh usuario/repo"
    exit 1
  fi
  # Acepta https://github.com/usuario/repo(.git) y git@github.com:usuario/repo(.git)
  DESTINO="$(echo "$REMOTO" | sed -E 's#^.*github\.com[:/]##; s#\.git$##')"
fi

if ! echo "$DESTINO" | grep -qE '^[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9._-]+$'; then
  err "«$DESTINO» no tiene la forma usuario/repo."
  exit 1
fi

ORIGEN="Edunzz/lima_2026"
if [ "$DESTINO" = "$ORIGEN" ]; then
  ok "Ya apunta a $ORIGEN; no hay nada que cambiar."
  exit 0
fi

OWNER="${DESTINO%%/*}"
NOMBRE="${DESTINO##*/}"
OWNER_MIN="$(echo "$OWNER" | tr '[:upper:]' '[:lower:]')"

echo "Reapuntando: $ORIGEN  →  $DESTINO"

for f in README.md AGENTS.md docs/assets/js/app.js; do
  [ -f "$f" ] || continue
  sed -i.bak \
    -e "s#Edunzz/lima_2026#$DESTINO#g" \
    -e "s#edunzz\.github\.io/lima_2026#$OWNER_MIN.github.io/$NOMBRE#g" "$f"
  rm -f "$f.bak"
  ok "$f"
done

# Fija el repo también para local/Codespaces, donde la URL no lo revela.
STEPS="docs/steps.md"
if [ -f "$STEPS" ]; then
  if grep -qE '^[ \t]*repo[ \t]*:' "$STEPS"; then
    sed -i.bak -E "s#^[ \t]*repo[ \t]*:.*#repo: $DESTINO#" "$STEPS"
  else
    sed -i.bak -E "0,/^[ \t]*inicio[ \t]*:.*/s##&\nrepo: $DESTINO#" "$STEPS"
  fi
  rm -f "$STEPS.bak"
  ok "$STEPS (línea «repo:»)"
fi

echo ""
ok "Listo. Revisa los cambios con: git diff"
echo "  Después: git add -A && git commit -m 'chore: apuntar al fork' && git push"
echo "  Y activa Pages en Settings → Pages → Source: GitHub Actions."
echo "  Tu guía quedará en: https://$OWNER_MIN.github.io/$NOMBRE/"

#!/usr/bin/env bash
# Acceso a la bóveda de Obsidian vía el plugin Local REST API (alternativa al MCP).
# Si Obsidian está cerrado, trabaja directo sobre la carpeta de la bóveda (Google Drive).
# Uso:
#   vault.sh list [carpeta/]          lista archivos
#   vault.sh get "ruta/nota.md"       imprime una nota
#   vault.sh put "ruta/nota.md" < f   crea o reemplaza una nota
#   vault.sh append "ruta/nota.md" < f  agrega al final
# Config local (nunca en el repo), en ~/.config/obsidian-mcp/:
#   key         API key del plugin   · obsidian.crt  certificado del plugin
#   vault_path  ruta de la carpeta de la bóveda (o variable OBSIDIAN_VAULT_PATH)
set -euo pipefail
BASE="https://127.0.0.1:27124"
CFG="$HOME/.config/obsidian-mcp"
VAULT="${OBSIDIAN_VAULT_PATH:-$(cat "$CFG/vault_path" 2>/dev/null || true)}"
cmd="${1:-}"; path="${2:-}"

api_up() { [ -f "$CFG/key" ] && curl -s -m 3 -o /dev/null --cacert "$CFG/obsidian.crt" "$BASE/"; }

if api_up; then
  KEY="$(cat "$CFG/key")"
  PY="$(command -v python3 || command -v python)"
  enc() { "$PY" -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }
  req() { curl -sS --fail-with-body --cacert "$CFG/obsidian.crt" -H "Authorization: Bearer $KEY" "$@"; }
  case "$cmd" in
    list)   req "$BASE/vault/$(enc "$path")" ;;
    get)    req "$BASE/vault/$(enc "$path")" ;;
    put)    req -X PUT  -H "Content-Type: text/markdown" --data-binary @- "$BASE/vault/$(enc "$path")" ;;
    append) req -X POST -H "Content-Type: text/markdown" --data-binary @- "$BASE/vault/$(enc "$path")" ;;
    *) echo "Uso: vault.sh list|get|put|append <ruta>" >&2; exit 2 ;;
  esac
elif [ -n "$VAULT" ] && [ -d "$VAULT" ]; then
  echo "(Obsidian cerrado: usando la carpeta de la bóveda directamente)" >&2
  f="$VAULT/$path"
  case "$cmd" in
    list)   ls -1p "$f" ;;
    get)    cat "$f" ;;
    put)    mkdir -p "$(dirname "$f")"; cat > "$f" ;;
    append) mkdir -p "$(dirname "$f")"; cat >> "$f" ;;
    *) echo "Uso: vault.sh list|get|put|append <ruta>" >&2; exit 2 ;;
  esac
else
  echo "Bóveda no disponible: Obsidian cerrado y sin ruta configurada (~/.config/obsidian-mcp/vault_path)." >&2
  exit 1
fi

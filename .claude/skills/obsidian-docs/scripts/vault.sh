#!/usr/bin/env bash
# Acceso a la bóveda de Obsidian vía el plugin Local REST API (alternativa al MCP).
# Uso:
#   vault.sh list [carpeta/]          lista archivos
#   vault.sh get "ruta/nota.md"       imprime una nota
#   vault.sh put "ruta/nota.md" < f   crea o reemplaza una nota
#   vault.sh append "ruta/nota.md" < f  agrega al final
# La clave se lee de ~/.config/obsidian-mcp/key: nunca va en el repo.
set -euo pipefail
BASE="https://127.0.0.1:27124"
CFG="$HOME/.config/obsidian-mcp"
KEY="$(cat "$CFG/key")"
enc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }
req() { curl -sS --fail-with-body --cacert "$CFG/obsidian.crt" -H "Authorization: Bearer $KEY" "$@"; }

cmd="${1:-}"; path="${2:-}"
case "$cmd" in
  list)   req "$BASE/vault/$(enc "$path")" ;;
  get)    req "$BASE/vault/$(enc "$path")" ;;
  put)    req -X PUT  -H "Content-Type: text/markdown" --data-binary @- "$BASE/vault/$(enc "$path")" ;;
  append) req -X POST -H "Content-Type: text/markdown" --data-binary @- "$BASE/vault/$(enc "$path")" ;;
  *) echo "Uso: vault.sh list|get|put|append <ruta>" >&2; exit 2 ;;
esac

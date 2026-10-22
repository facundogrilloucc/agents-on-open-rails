#!/usr/bin/env bash
# Exporta el grafo de graphify (graphify-out/graph.json) como notas a la bóveda de Obsidian,
# en la subcarpeta "08 Grafo del código". Reemplaza esa carpeta entera; no toca el resto de la bóveda.
#
# Ruta de la bóveda (en este orden): $OBSIDIAN_VAULT_PATH o ~/.config/obsidian-mcp/vault_path.
# Requiere graphify (uv tool install graphifyy). Para regenerar el grafo antes: /graphify --update
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VAULT="${OBSIDIAN_VAULT_PATH:-$(cat "$HOME/.config/obsidian-mcp/vault_path" 2>/dev/null || true)}"
[ -n "$VAULT" ] && [ -d "$VAULT" ] || { echo "No encuentro la bóveda. Definí OBSIDIAN_VAULT_PATH o ~/.config/obsidian-mcp/vault_path" >&2; exit 1; }
[ -f "$ROOT/graphify-out/graph.json" ] || { echo "Falta graphify-out/graph.json: corré /graphify primero" >&2; exit 1; }

DEST="$VAULT/08 Grafo del código"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

graphify export obsidian \
  --graph "$ROOT/graphify-out/graph.json" \
  --labels "$ROOT/graphify-out/.graphify_labels.json" \
  --dir "$TMP/out" >/dev/null
rm -rf "$TMP/out/.obsidian"   # config de vault propia de graphify: no aplica dentro de una subcarpeta

# Índice de la carpeta
{
  echo "# Grafo del código"
  echo
  echo "Notas generadas automáticamente por graphify a partir del repo. **No editar a mano**: se reemplazan en cada exportación."
  echo
  echo "- Generado: $(date +%F) desde \`graphify-out/graph.json\` (commit \`$(git -C "$ROOT" rev-parse --short HEAD)\`)"
  echo "- Vista visual: abrir \`graph.canvas\` en esta carpeta."
  echo "- Regenerar: \`/graphify --update\` y después \`scripts/graph-to-obsidian.sh\`."
  echo
  echo "## Comunidades"
  for f in "$TMP/out"/_COMMUNITY_*.md; do n="$(basename "$f" .md)"; echo "- [[$n|${n#_COMMUNITY_}]]"; done
  echo
  echo "Volver a [[00 Inicio]]."
} > "$TMP/out/00 Índice del grafo.md"

rm -rf "$DEST"
mv "$TMP/out" "$DEST"
echo "Grafo exportado: $(find "$DEST" -name '*.md' | wc -l | tr -d ' ') notas en $DEST"

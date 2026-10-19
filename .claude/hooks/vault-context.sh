#!/usr/bin/env bash
# SessionStart: carga "00 Inicio.md" de la bóveda como contexto.
S="$(dirname "$0")/../skills/obsidian-docs/scripts/vault.sh"
if note="$("$S" get "00 Inicio.md" 2>/dev/null)"; then
  echo "Contexto del proyecto (bóveda de Obsidian, 00 Inicio.md). Usar la skill obsidian-docs para leer más y mantenerla al día:"
  echo "$note"
else
  echo "No se pudo leer la bóveda de Obsidian (¿Obsidian cerrado?). Avisar al usuario y usar la skill obsidian-docs cuando vuelva a estar disponible."
fi

# Proyecto Agents on Open Rails

Proyecto de Facundo Grillo y Gregorio para la hackatón *Agents on Open Rails* (Celo × Loops House).

## Documentación: bóveda de Obsidian
- La bóveda de Obsidian es la fuente de verdad del proyecto (objetivos, decisiones, arquitectura, archivos, tareas, bitácora).
- **Usar siempre la skill `obsidian-docs`:** leer `00 Inicio.md` al empezar y actualizar la bóveda después de cada cambio relevante y al cerrar cada tarea.
- Nunca escribir la API key de Obsidian en el repo: el repo va a ser público.

## Código
- App web en `web/` (Next.js 16: leer `web/AGENTS.md` y la documentación en `web/node_modules/next/dist/docs/` antes de escribir código de Next).
- Solo Celo mainnet (chain id 42220). Toda transacción lleva la etiqueta de atribución (ERC-8021).

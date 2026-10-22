---
name: obsidian-docs
description: Mantiene actualizada la bóveda de Obsidian del proyecto Agents on Open Rails (objetivos, decisiones, arquitectura, archivos, tareas, bitácora). Usar al empezar a trabajar para cargar contexto, y después de cualquier cambio relevante — decisión de producto o de track, archivo o carpeta nueva, dependencia, contrato o dirección, tarea completada, pregunta resuelta o nueva, información nueva de la hackatón o de los sponsors — y siempre al cerrar una tarea.
---

# Documentación del proyecto en Obsidian

La bóveda es la **fuente de verdad** del proyecto. Objetivo: que nadie (Facundo, Gregorio o Claude) pierda el hilo.

## Cómo acceder
1. **Preferido:** herramientas del MCP `obsidian` (`mcp__obsidian__*`). Si aparecen como diferidas, cargarlas con ToolSearch (`obsidian`).
2. **Alternativa:** `.claude/skills/obsidian-docs/scripts/vault.sh` (`list`, `get`, `put`, `append`).
3. Si Obsidian está cerrado (error de conexión), avisar al usuario en una línea y seguir; anotar lo pendiente para subirlo después.

**Nunca** escribir la API key en archivos del repo, notas ni mensajes. Vive en `~/.config/obsidian-mcp/key`.

La bóveda está en Google Drive (carpeta `OBSIDIAN/Proyecto Open Rails Hackathon`, compartida con Gregorio). Cada máquina indica su ruta local en `OBSIDIAN_VAULT_PATH` o en `~/.config/obsidian-mcp/vault_path`. En Windows, `vault.sh` corre en Git Bash (el mismo shell que usa Claude Code).

## Convivencia: escriben los agentes de Facundo y de Gregorio
Google Drive no mezcla ediciones simultáneas: si dos máquinas cambian la misma nota a la vez, una pisa a la otra o aparece una copia en conflicto.
- **Leer justo antes de escribir** y hacer cambios chicos. Preferir `append` a reescribir la nota entera.
- **Firmar las entradas** de `06 Bitácora` y `04 Decisiones` con el autor: `- (Gregorio) …` / `- (Facundo) …`.
- Las **tareas por persona** viven en `TODO.md` del repo; en la bóveda solo se resumen.
- **`08 Grafo del código/` es generada:** solo se toca con `node scripts/graph-to-obsidian.mjs`, nunca a mano ni exportando graphify a otra carpeta de la bóveda.
- Si aparece un archivo duplicado o "en conflicto", unir el contenido en la nota original, borrar la copia y avisar al usuario.

## Estructura de la bóveda
| Nota | Qué contiene |
|---|---|
| `00 Inicio.md` | Estado actual, próximos pasos y mapa. **Leer siempre primero.** |
| `01 Hackatón/` | `Reglas y fechas`, `Tracks y criterios`, `Recursos` |
| `02 Producto/` | `Idea actual`, `Ideas descartadas` |
| `03 Técnico/` | `Arquitectura`, `Estructura del repo`, `Contratos y tokens`, `Entorno y herramientas` |
| `04 Decisiones.md` | Registro: `- **AAAA-MM-DD** · decisión · por qué` |
| `05 Roadmap y tareas.md` | Checklist por semana |
| `06 Bitácora/AAAA-MM-DD.md` | Qué se hizo cada día |
| `07 Preguntas abiertas.md` | Dudas sin resolver |
| `Equipo.md` | Integrantes y división de trabajo |

## Al empezar una sesión o tarea
1. Leer `00 Inicio.md` y las notas relacionadas con la tarea.
2. Repasar puntos clave que afectan la tarea y mencionarlos si chocan con lo pedido. Recordatorios permanentes:
   - Solo cuenta **Celo mainnet**; **etiqueta de atribución** en toda transacción desde la primera.
   - **ERC-8004** obligatorio; **repo público**; cierre **lun 9 nov 06:00 (ARG)**.
   - Revisar `07 Preguntas abiertas.md`: si la tarea resuelve alguna, cerrarla.

## Después de cada cambio relevante
Actualizar **solo lo que cambió**, con ediciones puntuales (no reescribir notas enteras sin necesidad):

| Si pasó esto… | Actualizar |
|---|---|
| Se decidió algo (producto, track, stack, alcance) | `04 Decisiones.md` (+ `Idea actual` o `Arquitectura` si corresponde) |
| Archivo/carpeta nueva o movida, script, comando | `03 Técnico/Estructura del repo.md` |
| Dependencia, servicio, arquitectura | `03 Técnico/Arquitectura.md` |
| Dirección de contrato, token, red | `03 Técnico/Contratos y tokens.md` (verificar onchain antes) |
| Tarea hecha o nueva | `05 Roadmap y tareas.md` (`- [x] … — AAAA-MM-DD`) |
| Duda nueva o resuelta | `07 Preguntas abiertas.md` |
| Info nueva de la hackatón/sponsors/Co-pilot | `01 Hackatón/…` |
| Cualquier sesión de trabajo | `06 Bitácora/<fecha de hoy>.md` (crear si no existe; viñetas cortas) |

Siempre actualizar `00 Inicio.md` (estado actual, próximos pasos, fecha en `actualizado:`) si cambió el panorama.

## Estilo
- Español, conciso, viñetas y tablas. Fechas absolutas (AAAA-MM-DD), nunca "ayer" o "la semana que viene".
- Enlazar notas con `[[Nombre de la nota]]`.
- Registrar hechos verificados; lo no confirmado va marcado como pendiente o en `07 Preguntas abiertas.md`.
- Sin datos sensibles (claves, claves privadas, seeds).

## Al terminar
Decir al usuario en una línea qué notas se actualizaron.

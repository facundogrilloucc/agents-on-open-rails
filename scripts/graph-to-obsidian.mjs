// Exporta el grafo de graphify (graphify-out/graph.json) como notas a la bóveda de Obsidian,
// en la subcarpeta "08 Grafo del código". Reemplaza esa carpeta entera; no toca el resto.
// Funciona en macOS, Linux y Windows.
//
//   node scripts/graph-to-obsidian.mjs
//
// Ruta de la bóveda: variable OBSIDIAN_VAULT_PATH, o el archivo ~/.config/obsidian-mcp/vault_path.
// Requiere graphify (uv tool install graphifyy==0.9.92). Para regenerar el grafo antes: /graphify --update
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const configFile = join(homedir(), ".config", "obsidian-mcp", "vault_path");
const VAULT =
  process.env.OBSIDIAN_VAULT_PATH || (existsSync(configFile) ? readFileSync(configFile, "utf8").trim() : "");

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
if (!VAULT || !existsSync(VAULT)) fail("No encuentro la bóveda. Definí OBSIDIAN_VAULT_PATH o ~/.config/obsidian-mcp/vault_path");
const graph = join(ROOT, "graphify-out", "graph.json");
if (!existsSync(graph)) fail("Falta graphify-out/graph.json: corré /graphify primero");

const tmp = mkdtempSync(join(tmpdir(), "graph-obsidian-"));
const out = join(tmp, "out");
try {
  execFileSync(
    "graphify",
    ["export", "obsidian", "--graph", graph, "--labels", join(ROOT, "graphify-out", ".graphify_labels.json"), "--dir", out],
    { stdio: "ignore", shell: process.platform === "win32" },
  );
  // graphify crea una config de vault propia: no aplica dentro de una subcarpeta.
  rmSync(join(out, ".obsidian"), { recursive: true, force: true });

  const commit = execFileSync("git", ["-C", ROOT, "rev-parse", "--short", "HEAD"]).toString().trim();
  const communities = readdirSync(out)
    .filter((f) => f.startsWith("_COMMUNITY_") && f.endsWith(".md"))
    .sort();
  const index = [
    "# Grafo del código",
    "",
    "Notas generadas automáticamente por graphify a partir del repo. **No editar a mano**: se reemplazan en cada exportación.",
    "",
    `- Generado: ${new Date().toISOString().slice(0, 10)} desde \`graphify-out/graph.json\` (commit \`${commit}\`)`,
    "- Vista visual: abrir `graph.canvas` en esta carpeta.",
    "- Regenerar: `/graphify --update` y después `node scripts/graph-to-obsidian.mjs`.",
    "",
    "## Comunidades",
    ...communities.map((f) => {
      const n = basename(f, ".md");
      return `- [[${n}|${n.replace("_COMMUNITY_", "")}]]`;
    }),
    "",
    "Volver a [[00 Inicio]].",
    "",
  ].join("\n");
  writeFileSync(join(out, "00 Índice del grafo.md"), index);

  const dest = join(VAULT, "08 Grafo del código");
  rmSync(dest, { recursive: true, force: true });
  try {
    renameSync(out, dest);
  } catch {
    // Distinto disco (por ejemplo, Google Drive): copiar en vez de mover.
    cpSync(out, dest, { recursive: true });
  }
  const notes = readdirSync(dest).filter((f) => f.endsWith(".md")).length;
  console.log(`Grafo exportado: ${notes} notas en ${dest}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

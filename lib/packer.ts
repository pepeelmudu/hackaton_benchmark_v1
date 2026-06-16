import * as fs from "fs";
import * as path from "path";

const EXCLUDE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "venv", ".venv",
  "__pycache__", "vendor", "target", ".cache", "coverage", ".turbo",
  "out", ".idea", ".vscode", "migrations",
]);

const EXCLUDE_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".pdf",
  ".zip", ".gz", ".tar", ".lock", ".woff", ".woff2", ".ttf", ".eot",
  ".mp4", ".mp3", ".mov", ".wav", ".bin", ".so", ".dylib", ".dll",
  ".pyc", ".class", ".jar", ".map", ".csv",
]);

const EXCLUDE_FILES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
  "Cargo.lock", "go.sum",
]);

// Pistas de que un archivo es "el corazón agéntico" -> prioridad alta.
const AGENTIC_HINTS = [
  "agent", "tool", "tools", "mcp", "prompt", "chain", "graph",
  "orchestr", "executor", "planner", "memory", "react", "loop",
  "workflow", "skill", "function_call", "tool_call",
];

const MAX_FILE_CHARS = 24_000; // un solo archivo no se come todo el presupuesto

interface Found {
  rel: string;
  full: string;
  size: number;
  priority: number;
}

function walk(dir: string, root: string, acc: Found[]) {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (EXCLUDE_DIRS.has(e.name) || e.name.startsWith(".")) continue;
      walk(path.join(dir, e.name), root, acc);
    } else if (e.isFile()) {
      const full = path.join(dir, e.name);
      const ext = path.extname(e.name).toLowerCase();
      if (EXCLUDE_EXT.has(ext) || EXCLUDE_FILES.has(e.name)) continue;
      let size = 0;
      try {
        size = fs.statSync(full).size;
      } catch {
        continue;
      }
      if (size > 400_000) continue; // archivos gigantes (probablemente datos)
      const rel = path.relative(root, full);
      const lower = rel.toLowerCase();
      const isAgentic = AGENTIC_HINTS.some((h) => lower.includes(h));
      const isReadme = lower.includes("readme");
      const priority = isAgentic ? 0 : isReadme ? 1 : 2;
      acc.push({ rel, full, size, priority });
    }
  }
}

function looksBinary(content: string): boolean {
  // Heurística: presencia de byte nulo => binario.
  for (let i = 0; i < content.length; i++) if (content.charCodeAt(i) === 0) return true;
  return false;
}

/**
 * Construye un "digest" textual del repo dentro de un presupuesto de caracteres.
 * Prioriza el código agéntico, luego READMEs, luego el resto. Empieza con el árbol.
 */
export function packRepo(dir: string, budgetChars = 180_000): string {
  const found: Found[] = [];
  walk(dir, dir, found);
  found.sort((a, b) => a.priority - b.priority || a.size - b.size);

  const tree = found.map((f) => `  ${f.rel} (${f.size}b)`).join("\n");
  let out = `ARBOL DE ARCHIVOS (${found.length} archivos relevantes):\n${tree}\n\n`;
  let used = out.length;

  for (const f of found) {
    if (used >= budgetChars) {
      out += `\n[... presupuesto agotado; no todos los archivos del arbol estan incluidos ...]`;
      break;
    }
    let content = "";
    try {
      content = fs.readFileSync(f.full, "utf8");
    } catch {
      continue;
    }
    if (looksBinary(content)) continue;
    if (content.length > MAX_FILE_CHARS) {
      content = content.slice(0, MAX_FILE_CHARS) + "\n[... truncado ...]";
    }
    const remaining = budgetChars - used;
    if (content.length > remaining) {
      content = content.slice(0, remaining) + "\n[... truncado por presupuesto ...]";
    }
    const block = `\n=== ${f.rel} ===\n${content}\n`;
    out += block;
    used += block.length;
  }
  return out;
}

import type { Project } from "./types";

/**
 * Parsea el contenido de repos.txt.
 * Formato por línea: `<url> - <nombres del equipo>`
 * Ignora líneas vacías y comentarios (que empiezan por `#`).
 */
export function parseRepos(text: string): Project[] {
  const projects: Project[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const sep = line.indexOf(" - ");
    const url = (sep === -1 ? line : line.slice(0, sep)).trim();
    const team = sep === -1 ? "" : line.slice(sep + 3).trim();

    const { owner, name } = parseOwnerName(url);
    if (!owner || !name) continue;

    projects.push({ url, owner, name, team });
  }
  return projects;
}

function parseOwnerName(url: string): { owner: string; name: string } {
  // Soporta https://github.com/owner/name(.git)?(/...)?
  const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
  const m = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (!m) return { owner: "", name: "" };
  return { owner: m[1], name: m[2] };
}

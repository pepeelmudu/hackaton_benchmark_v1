import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import type { Project } from "./types";

export interface FetchResult {
  dir: string;
  commitSha: string;
}

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

/**
 * Devuelve la URL de clonado, inyectando GITHUB_TOKEN si está disponible.
 * Si no, devuelve la URL tal cual (git usará el credential helper de gh si existe).
 */
function authUrl(url: string): string {
  const token = process.env.GITHUB_TOKEN;
  if (token && url.startsWith("https://github.com/")) {
    return url.replace("https://github.com/", `https://${token}@github.com/`);
  }
  return url;
}

/**
 * Clona (superficial) o actualiza el repo en workdir/<owner>__<name>.
 * Devuelve la ruta local y el SHA del último commit.
 * Lanza un Error con mensaje claro si el repo no es accesible.
 */
export function fetchRepo(project: Project, workdir = "workdir"): FetchResult {
  fs.mkdirSync(workdir, { recursive: true });
  const dest = path.join(workdir, `${project.owner}__${project.name}`);
  const url = authUrl(project.url);

  try {
    if (!fs.existsSync(path.join(dest, ".git"))) {
      git(["clone", "--depth", "1", url, dest]);
    } else {
      git(["remote", "set-url", "origin", url], dest);
      git(["fetch", "--depth", "1", "origin"], dest);
      // resetea al HEAD remoto de la rama por defecto
      const head = git(["rev-parse", "--abbrev-ref", "origin/HEAD"], dest); // e.g. origin/main
      git(["reset", "--hard", head], dest);
    }
  } catch (err: any) {
    const msg = (err?.stderr || err?.message || "").toString().split("\n")[0];
    throw new Error(`No se pudo acceder al repo ${project.url}: ${msg}`);
  }

  const commitSha = git(["rev-parse", "HEAD"], dest);
  return { dir: dest, commitSha };
}

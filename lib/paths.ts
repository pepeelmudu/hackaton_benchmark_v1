import * as path from "path";

// Rutas configurables por entorno. En local usan ./data y ./workdir;
// en Render apuntan al disco persistente (DATA_DIR=/var/data).
const DATA_DIR = process.env.DATA_DIR || "data";

export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "benchmark.sqlite");
export const WORKDIR = process.env.WORKDIR || path.join(DATA_DIR, "workdir");

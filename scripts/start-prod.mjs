// Arranca, en un solo contenedor de Render, el dashboard (next start) y el
// monitor periódico (watch). Comparten el disco persistente (SQLite + workdir).
import { spawn } from "node:child_process";

const PORT = process.env.PORT || "3000";

function start(name, cmd, args, { fatal }) {
  console.log(`[start] lanzando ${name}: ${cmd} ${args.join(" ")}`);
  const p = spawn(cmd, args, { stdio: "inherit", env: process.env });
  p.on("exit", (code) => {
    console.log(`[start] ${name} terminó (code ${code})`);
    if (fatal) {
      // Si cae el servidor web, salimos para que Render reinicie el contenedor.
      process.exit(code ?? 1);
    } else {
      // El watch se reintenta solo a los 5s si muere.
      setTimeout(() => start(name, cmd, args, { fatal }), 5000);
    }
  });
  return p;
}

// Monitor periódico (re-analiza repos con commits nuevos cada 15 min).
start("watch", "npx", ["tsx", "scripts/watch.ts"], { fatal: false });
// Dashboard.
start("web", "npx", ["next", "start", "-p", PORT], { fatal: true });

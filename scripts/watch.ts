import "../lib/load-env";
import cron from "node-cron";
import { openDb } from "../lib/store";
import { runPipeline } from "../lib/pipeline";

const db = openDb();
let running = false;

async function tick() {
  if (running) {
    console.log("[watch] ya hay un análisis en curso, salto este tick");
    return;
  }
  running = true;
  try {
    await runPipeline(db);
  } catch (err) {
    console.error("[watch] error en el ciclo:", err);
  } finally {
    running = false;
  }
}

console.log("[watch] arrancando. Revisa commits nuevos cada 30 min. Ctrl+C para parar.");
tick(); // pasada inmediata al arrancar
cron.schedule("*/30 * * * *", tick);

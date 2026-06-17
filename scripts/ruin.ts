import "../lib/load-env";
import { runRuinStandalone } from "../lib/ruin-pipeline";

const force = process.argv.includes("--force");

runRuinStandalone({ force })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

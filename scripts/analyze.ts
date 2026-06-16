import "../lib/load-env";
import { runPipelineStandalone } from "../lib/pipeline";

const force = process.argv.includes("--force");

runPipelineStandalone({ force })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

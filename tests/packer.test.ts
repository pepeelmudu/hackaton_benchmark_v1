import { packRepo } from "@/lib/packer";
import { test, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function tmpRepo(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pk-"));
}

test("incluye código y excluye node_modules", () => {
  const dir = tmpRepo();
  fs.writeFileSync(path.join(dir, "agent.py"), "def tool(): return run_tool()");
  fs.mkdirSync(path.join(dir, "node_modules"));
  fs.writeFileSync(path.join(dir, "node_modules", "x.js"), "junk_dependency_code");

  const digest = packRepo(dir, 100_000);
  expect(digest).toContain("agent.py");
  expect(digest).toContain("def tool");
  expect(digest).not.toContain("junk_dependency_code");
});

test("respeta el presupuesto de caracteres", () => {
  const dir = tmpRepo();
  fs.writeFileSync(path.join(dir, "big.js"), "x".repeat(50_000));
  const digest = packRepo(dir, 5_000);
  expect(digest.length).toBeLessThan(8_000); // árbol + algo de contenido truncado
});

test("prioriza archivos con nombre agéntico", () => {
  const dir = tmpRepo();
  fs.writeFileSync(path.join(dir, "zzz_utils.js"), "const a=1;");
  fs.writeFileSync(path.join(dir, "agent_loop.js"), "while(true){ act(); }");
  const digest = packRepo(dir, 100_000);
  expect(digest.indexOf("agent_loop.js")).toBeLessThan(digest.indexOf("zzz_utils.js"));
});

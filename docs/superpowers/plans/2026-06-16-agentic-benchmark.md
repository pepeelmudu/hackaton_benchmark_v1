# Agentic Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task. Hackathon timeline — tests target the core logic (packer, scoring, store), not UI.

**Goal:** App que clona los repos del hackathon, los puntúa con Claude por cuán agénticos son (0-10), guarda histórico, y los muestra en un dashboard BBS verde fósforo.

**Architecture:** Pipeline standalone en Node (ingest → fetch → pack → analyze → store en SQLite) ejecutable on-demand y en bucle cada 15 min. Next.js (App Router) lee SQLite y renderiza el dashboard; un API route dispara el re-análisis.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · better-sqlite3 · @anthropic-ai/sdk (claude-sonnet-4-6) · Recharts · node-cron · tsx · vitest.

---

## File Structure

```
package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, .gitignore, .env.example
lib/
  types.ts        # tipos compartidos (Project, AnalysisResult, Snapshot)
  ingest.ts       # parsea repos.txt → Project[]
  fetcher.ts      # git clone --depth 1 / pull → ruta local + commit sha
  packer.ts       # repo → "digest" textual con presupuesto de tokens
  rubric.ts       # pesos + cálculo de nota global + prompt de la rúbrica
  analyzer.ts     # Claude → AnalysisResult validado
  store.ts        # SQLite: init, upsert project, insert snapshot, queries
  pipeline.ts     # orquesta ingest→fetch→pack→analyze→store para todos
scripts/
  analyze.ts      # corre el pipeline una vez (npm run analyze)
  watch.ts        # corre el pipeline cada 15 min (npm run watch)
app/
  layout.tsx, globals.css, page.tsx        # dashboard
  components/Leaderboard.tsx, ProjectCard.tsx, RadarScores.tsx, EvolutionChart.tsx, ReanalyzeButton.tsx
  api/leaderboard/route.ts
  api/project/[id]/route.ts
  api/history/[id]/route.ts
  api/reanalyze/route.ts
tests/
  packer.test.ts, rubric.test.ts, store.test.ts, ingest.test.ts
repos.txt
data/benchmark.sqlite   # (gitignored)
workdir/                # repos clonados (gitignored)
```

---

## Task 1: Scaffold del proyecto

**Files:** Create `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`. Modify `.gitignore`.

- [ ] **Step 1:** `npm init -y`, instalar deps:
```bash
npm i next@14 react react-dom better-sqlite3 @anthropic-ai/sdk recharts node-cron
npm i -D typescript @types/react @types/node @types/better-sqlite3 tailwindcss postcss autoprefixer tsx vitest
```
- [ ] **Step 2:** Crear `tsconfig.json` (target ES2022, module ESNext, moduleResolution Bundler, jsx preserve, paths `@/*`→`./`), `next.config.mjs` (`{ experimental:{ serverComponentsExternalPackages:['better-sqlite3'] } }`), `tailwind.config.ts` (content `./app/**/*`), `postcss.config.mjs`, `vitest.config.ts` (environment node).
- [ ] **Step 3:** `.env.example` con `ANTHROPIC_API_KEY=`. Añadir scripts a package.json: `"dev":"next dev"`, `"build":"next build"`, `"start":"next start"`, `"analyze":"tsx scripts/analyze.ts"`, `"watch":"tsx scripts/watch.ts"`, `"test":"vitest run"`.
- [ ] **Step 4:** Verificar tipográfico: `npx tsc --noEmit` no peta por config.
- [ ] **Step 5:** Commit `chore: scaffold Next.js + tooling`.

## Task 2: Tipos compartidos

**Files:** Create `lib/types.ts`.

- [ ] **Step 1:** Definir:
```ts
export type DimensionKey = 'tool_use'|'agency_loop'|'planning'|'memory'|'integration'|'robustness';
export interface DimensionScore { score: number; justification: string }
export interface AnalysisResult {
  overall: number; verdict: string; is_disguised_llm: boolean;
  dimensions: Record<DimensionKey, DimensionScore>;
  highlights: string[]; red_flags: string[];
}
export interface Project { id?: number; url: string; owner: string; name: string; team: string }
export interface Snapshot {
  id?: number; project_id: number; ts: number; commit_sha: string;
  overall: number; verdict: string; is_disguised_llm: boolean; payload: AnalysisResult;
  error?: string|null;
}
```
- [ ] **Step 2:** Commit `feat: shared types`.

## Task 3: Ingest (parsear repos.txt) — TDD

**Files:** Create `lib/ingest.ts`, `tests/ingest.test.ts`.

- [ ] **Step 1: Test que falla:**
```ts
import { parseRepos } from '@/lib/ingest';
import { test, expect } from 'vitest';
test('parsea url y equipo, ignora comentarios y vacías', () => {
  const txt = `# comentario\n\nhttps://github.com/elevenyellow/cluedo - Leños y Jose\n`;
  const r = parseRepos(txt);
  expect(r).toEqual([{ url:'https://github.com/elevenyellow/cluedo', owner:'elevenyellow', name:'cluedo', team:'Leños y Jose' }]);
});
```
- [ ] **Step 2:** Run `npx vitest run tests/ingest.test.ts` → FAIL.
- [ ] **Step 3:** Implementar `parseRepos(text)`: split por líneas, descartar `''` y las que empiecen por `#`, separar por ` - ` (primer guión rodeado de espacios), parsear owner/name del path de la URL.
- [ ] **Step 4:** Run test → PASS.
- [ ] **Step 5:** Commit `feat: parse repos.txt`.

## Task 4: Store (SQLite) — TDD

**Files:** Create `lib/store.ts`, `tests/store.test.ts`.

- [ ] **Step 1: Test que falla** (usar DB en `:memory:` vía parámetro opcional `openDb(path)`):
```ts
import { openDb, upsertProject, insertSnapshot, getLeaderboard } from '@/lib/store';
import { test, expect } from 'vitest';
test('upsert + leaderboard devuelve última nota por proyecto', () => {
  const db = openDb(':memory:');
  const pid = upsertProject(db, { url:'u', owner:'o', name:'n', team:'t' });
  insertSnapshot(db, { project_id:pid, ts:1, commit_sha:'a', overall:5, verdict:'v', is_disguised_llm:false, payload:{} as any });
  insertSnapshot(db, { project_id:pid, ts:2, commit_sha:'b', overall:8, verdict:'v2', is_disguised_llm:false, payload:{} as any });
  const lb = getLeaderboard(db);
  expect(lb[0].overall).toBe(8);
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar `openDb(path='data/benchmark.sqlite')` (crea tablas `projects`, `snapshots` con `CREATE TABLE IF NOT EXISTS`; `payload` como TEXT JSON), `upsertProject` (INSERT … ON CONFLICT(url) DO UPDATE, devuelve id), `insertSnapshot` (serializa payload), `getLeaderboard` (subquery del snapshot con `ts` máximo por proyecto, JOIN projects, ORDER BY overall DESC), `getProject(id)`, `getHistory(id)` (todos los snapshots ordenados por ts).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: sqlite store`.

## Task 5: Rubric (pesos + nota global) — TDD

**Files:** Create `lib/rubric.ts`, `tests/rubric.test.ts`.

- [ ] **Step 1: Test que falla:**
```ts
import { WEIGHTS, computeOverall } from '@/lib/rubric';
import { test, expect } from 'vitest';
test('suma de pesos = 1', () => {
  expect(Object.values(WEIGHTS).reduce((a,b)=>a+b,0)).toBeCloseTo(1);
});
test('nota global ponderada', () => {
  const dims = { tool_use:{score:10,justification:''}, agency_loop:{score:10,justification:''}, planning:{score:10,justification:''}, memory:{score:10,justification:''}, integration:{score:10,justification:''}, robustness:{score:10,justification:''} } as any;
  expect(computeOverall(dims)).toBe(10);
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar `WEIGHTS` (tool_use .25, agency_loop .25, planning .20, memory .10, integration .10, robustness .10), `computeOverall(dims)` (suma score*peso, redondea a 1 decimal), y exportar `RUBRIC_PROMPT` (string con la definición de cada dimensión y la instrucción de detectar "LLM disfrazado").
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: scoring rubric`.

## Task 6: Packer (repo → digest) — TDD

**Files:** Create `lib/packer.ts`, `tests/packer.test.ts`.

- [ ] **Step 1: Test que falla** (crear dir temporal con archivos):
```ts
import { packRepo } from '@/lib/packer';
import { test, expect } from 'vitest';
import * as fs from 'fs'; import * as os from 'os'; import * as path from 'path';
test('incluye código, excluye node_modules y binarios', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'pk'));
  fs.writeFileSync(path.join(dir,'agent.py'), 'def tool(): pass');
  fs.mkdirSync(path.join(dir,'node_modules')); fs.writeFileSync(path.join(dir,'node_modules','x.js'),'junk');
  const d = packRepo(dir, 100_000);
  expect(d).toContain('agent.py'); expect(d).toContain('def tool');
  expect(d).not.toContain('junk');
});
```
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implementar `packRepo(dir, budgetChars)`: walk recursivo; excluir dirs `node_modules .git dist build .next venv __pycache__ vendor`; excluir por extensión binaria/asset (`png jpg gif svg pdf zip lock woff …`); priorizar archivos con nombres agénticos (`agent tool mcp prompt chain graph` en el path) primero, luego resto de código; ir concatenando `\n=== <relpath> ===\n<contenido>` hasta agotar `budgetChars` (truncar el último). Devolver string. Empezar con un árbol de archivos al principio.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: repo packer`.

## Task 7: Fetcher (git clone/pull)

**Files:** Create `lib/fetcher.ts`.

- [ ] **Step 1:** Implementar `fetchRepo(project, workdir='workdir')`: si `workdir/<owner>__<name>` no existe → `git clone --depth 1 <url> <dest>`; si existe → `git -C <dest> fetch --depth 1 && git -C <dest> reset --hard @{u}`. Usar `execFileSync('git', …)`. Devolver `{ dir, commitSha }` (sha vía `git -C <dest> rev-parse HEAD`). Capturar errores y relanzar con mensaje claro (repo sin acceso). Asume auth de `gh` activa (git usa el credential helper de gh).
- [ ] **Step 2:** Smoke manual con un repo público pequeño (no test automatizado — hace red).
- [ ] **Step 3:** Commit `feat: git fetcher`.

## Task 8: Analyzer (Claude → AnalysisResult)

**Files:** Create `lib/analyzer.ts`.

- [ ] **Step 1:** Implementar `analyze(digest, projectName)`: cliente `new Anthropic()`; `messages.create({ model:'claude-sonnet-4-6', max_tokens:2000, tools:[scoreTool], tool_choice:{type:'tool',name:'submit_score'} , messages:[{role:'user',content: RUBRIC_PROMPT + '\n\nPROYECTO: '+projectName+'\n\nCÓDIGO:\n'+digest }] })`. `scoreTool` = JSON schema con `dimensions` (6 keys, cada una score 0-10 + justification), `verdict`, `is_disguised_llm`, `highlights`, `red_flags`. Parsear el `tool_use` block → objeto; calcular `overall` con `computeOverall` (no confiar en el del modelo). Reintentar 2x con backoff si falla. Devolver `AnalysisResult`.
- [ ] **Step 2:** Smoke manual con un digest de ejemplo.
- [ ] **Step 3:** Commit `feat: claude analyzer`.

## Task 9: Pipeline + scripts

**Files:** Create `lib/pipeline.ts`, `scripts/analyze.ts`, `scripts/watch.ts`.

- [ ] **Step 1:** `runPipeline(db)`: lee `repos.txt`, `parseRepos`; para cada project: `upsertProject`, `fetchRepo`, si el `commitSha` == último snapshot → skip; `packRepo`, `analyze`, `insertSnapshot`. try/catch por proyecto → en error inserta snapshot con `error` y no rompe el resto. `console.log` de progreso.
- [ ] **Step 2:** `scripts/analyze.ts`: `openDb()` → `runPipeline(db)` → exit.
- [ ] **Step 3:** `scripts/watch.ts`: `node-cron.schedule('*/15 * * * *', run)` + run inmediato al arrancar.
- [ ] **Step 4:** Ejecutar `npm run analyze` de verdad con los 3 repos → comprobar filas en SQLite.
- [ ] **Step 5:** Commit `feat: analysis pipeline + scripts`.

## Task 10: API routes

**Files:** Create `app/api/leaderboard/route.ts`, `app/api/project/[id]/route.ts`, `app/api/history/[id]/route.ts`, `app/api/reanalyze/route.ts`.

- [ ] **Step 1:** Cada GET: `openDb()` + query correspondiente → `NextResponse.json(...)`. `export const dynamic='force-dynamic'`.
- [ ] **Step 2:** `reanalyze` POST: lanza el pipeline en background (`spawn('npm',['run','analyze'])` detached) y responde `{started:true}`.
- [ ] **Step 3:** Probar con `curl localhost:3000/api/leaderboard`.
- [ ] **Step 4:** Commit `feat: api routes`.

## Task 11: Dashboard UI (estética BBS verde fósforo)

**Files:** Create `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/components/*`.

- [ ] **Step 1:** Durante esta tarea aplicar los skills de diseño: `frontend-design`, `high-end-visual-design`, `web-design-guidelines`. Paleta: fondo `#0a0e0a`, verde fósforo `#39ff14`/`#00ff41`, ámbar de acento, fuente mono (Geist Mono / JetBrains Mono). Scanlines sutiles vía CSS, cursor parpadeante, bordes tipo ASCII. Contraste AA garantizado para el texto de datos.
- [ ] **Step 2:** `globals.css`: variables de color, efecto scanline (`background: repeating-linear-gradient`), glow del texto verde (`text-shadow`), reset.
- [ ] **Step 3:** `Leaderboard.tsx`: tabla/ranking con 🥇🥈🥉, barra de nota (0-10), badge rojo `⚠ LLM DISFRAZADO` si `is_disguised_llm`. Fetch a `/api/leaderboard`.
- [ ] **Step 4:** `RadarScores.tsx`: Recharts `RadarChart` de las 6 dimensiones. `ProjectCard.tsx`: radar + justificaciones + highlights/red_flags + commit. `EvolutionChart.tsx`: Recharts `LineChart` con una línea por equipo (fetch a `/api/history`). `ReanalyzeButton.tsx`: POST a `/api/reanalyze`.
- [ ] **Step 5:** `page.tsx`: header terminal `> AGENTIC_BENCHMARK`, última actualización, `<Leaderboard/>`, `<EvolutionChart/>`, y al click en una fila expandir `<ProjectCard/>`. Auto-refresh cada 30s.
- [ ] **Step 6:** `npm run dev`, revisar en navegador con los datos reales.
- [ ] **Step 7:** Commit `feat: BBS dashboard UI`.

## Task 12: Verificación end-to-end

- [ ] **Step 1:** `gh auth status` OK; `.env.local` con `ANTHROPIC_API_KEY`.
- [ ] **Step 2:** `npm run analyze` puntúa los 3 repos sin error.
- [ ] **Step 3:** `npm run dev` → dashboard muestra ranking + radares + evolución.
- [ ] **Step 4:** `npm run watch` corriendo para acumular histórico de cara a mañana.
- [ ] **Step 5:** Commit final / tag `demo-ready`.

---

## Self-Review

- **Cobertura del spec:** ingest✓(T3) fetch✓(T7) packer✓(T6) analyzer✓(T8) store/histórico✓(T4) scheduler✓(T9) API✓(T10) dashboard+estética✓(T11) rúbrica/pesos✓(T5) auth/errores✓(T7/T9/T12). Sin huecos.
- **Placeholders:** ninguno; cada tarea tiene archivos y lógica concretos.
- **Consistencia de tipos:** `AnalysisResult`/`Snapshot`/`Project` definidos en T2 y usados igual en T4/T8/T9/T10.

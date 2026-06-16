# Agentic Benchmark — Design Spec

**Fecha:** 2026-06-16
**Autor:** Lucas (elevenyellow)
**Estado:** En revisión

## 1. Resumen

Aplicación que monitorea y evalúa los proyectos de un hackathon interno (todos sobre
agentes de IA) y les asigna una puntuación de **"cuán agénticos son"** del 0 al 10.

El objetivo es destapar el patrón "**LLM disfrazado de agente**": proyectos que parecen
agentes pero que en realidad son un simple `prompt → respuesta` sin ejecución real de
herramientas, sin loop de razonamiento, ni autonomía.

El resultado se muestra en una **landing/dashboard estilo hacker/BBS retro** con un
ranking de proyectos, el desglose por dimensiones de cada uno, y la **evolución de las
notas a lo largo del tiempo** (re-análisis periódico).

## 2. Objetivos y alcance

### En alcance
- Leer una lista de repos (públicos y privados del workspace de empresa) desde `repos.txt`.
- Clonar/actualizar cada repo (clonado superficial) usando auth de `gh` CLI.
- Análisis **estático** del código con un LLM (Claude) → subnotas + nota global + justificación.
- Re-análisis periódico (cada ~15 min) guardando **histórico con timestamp**.
- Dashboard con ranking, detalle por proyecto (radar), y gráfica de evolución temporal.
- Botón de "Re-analizar ahora" para forzar una pasada.

### Fuera de alcance (YAGNI)
- Análisis **dinámico** (levantar y ejecutar los proyectos): inviable para repos arbitrarios
  en el tiempo del hackathon (cada uno necesita su entorno, API keys, dependencias).
- Webhooks en tiempo real (requieren admin de los repos/org). Usamos polling.
- Autenticación de usuarios / multi-tenant. Es una herramienta de un solo uso para mañana.

## 3. Decisiones clave

| Decisión | Elección | Motivo |
|---|---|---|
| Acceso a repos | Lista manual en `repos.txt` | Algunos en org privada, otros fuera. No hay un único origen. |
| Auth | `gh auth login` (GitHub CLI) | Sin copiar/pegar tokens; reutilizable para API y `git clone`. |
| Metodología | Análisis **estático** con LLM | Único método que garantiza evaluar *todos* los repos para mañana. |
| Evolución | **Histórico** (serie temporal) | Dashboard muestra cómo sube/baja la nota conforme commitean. |
| Stack | Next.js full-stack (TypeScript) | Un solo proyecto: landing + dashboard + backend. Rápido y pulido. |
| Almacenamiento | SQLite | Cero infra; perfecto para series temporales de notas. |
| Modelo de análisis | Claude **Sonnet 4.6** (análisis), **Opus 4.8** (opcional veredicto) | Sonnet: rápido/barato al repetir cada 15 min. |

## 4. Rúbrica de puntuación (0-10)

Para cada repo, Claude puntúa **6 dimensiones**. Cada dimensión incluye una
**justificación en texto** que explica la nota (clave para la presentación).

| Dimensión | Qué mide | Peso |
|---|---|---|
| 🔧 Tool Use / Acción real | ¿Define herramientas y las **ejecuta** con efectos reales (API, FS, DB, web)? ¿O solo genera texto? | 25% |
| 🔁 Agency Loop | ¿Hay ciclo razonar→actuar→observar con decisiones dinámicas? ¿O flujo lineal fijo? | 25% |
| 🧠 Planificación / Autonomía | ¿Descompone tareas, decide pasos solo, multi-step? | 20% |
| 💾 Memoria / Estado | ¿Mantiene estado/contexto entre pasos? | 10% |
| 🌐 Integración externa | APIs, side-effects reales en el mundo. | 10% |
| 🛡️ Robustez | ¿Maneja errores de tools, reintentos, validación? | 10% |

**Nota global** = media ponderada de las 6 dimensiones, redondeada a 1 decimal.

El LLM devuelve resultado **estructurado (JSON)** validado contra un schema:
```json
{
  "overall": 6.4,
  "verdict": "Agente real con tool use limitado",
  "is_disguised_llm": false,
  "dimensions": {
    "tool_use":      { "score": 5, "justification": "Define 3 tools pero solo invoca 1 realmente..." },
    "agency_loop":   { "score": 7, "justification": "..." },
    "planning":      { "score": 6, "justification": "..." },
    "memory":        { "score": 8, "justification": "..." },
    "integration":   { "score": 6, "justification": "..." },
    "robustness":    { "score": 4, "justification": "..." }
  },
  "highlights":  ["Loop de reintentos bien hecho"],
  "red_flags":   ["Las tools 'search' y 'email' nunca se invocan en el flujo principal"]
}
```

## 5. Arquitectura

```
repos.txt
  → [Ingest]     parsea url + nombres de equipo
  → [Fetcher]    git clone --depth 1 / git pull (auth gh) → /workdir/<repo>
  → [Packer]     selecciona código relevante (excluye node_modules, lockfiles, binarios,
                 assets), arma un "repo digest" con árbol de archivos + contenidos clave
  → [Analyzer]   Claude (Sonnet 4.6) + prompt de rúbrica → JSON estructurado validado
  → [Store]      inserta snapshot {repo, commit_sha, timestamp, scores...} en SQLite
  ↑ [Scheduler]  node-cron repite el ciclo cada ~15 min
Dashboard (Next.js) → API routes leen SQLite → leaderboard + detalle + evolución
```

### Componentes (unidades con un propósito claro)
- **Ingest** (`lib/ingest.ts`): parsea `repos.txt` → `{ url, owner, name, team }[]`.
- **Fetcher** (`lib/fetcher.ts`): clona/actualiza repos; devuelve ruta local + último commit SHA.
- **Packer** (`lib/packer.ts`): construye el "digest" textual del repo dentro de un presupuesto
  de tokens; filtra ruido (deps, binarios, assets, lockfiles).
- **Analyzer** (`lib/analyzer.ts`): llama a Claude con la rúbrica; devuelve el JSON validado por schema.
- **Store** (`lib/store.ts`): SQLite. Tabla `snapshots` (serie temporal) + vista "última nota".
- **Scheduler** (`lib/scheduler.ts`): node-cron; orquesta ingest→fetch→pack→analyze→store.
- **API** (`app/api/*`): `GET /api/leaderboard`, `GET /api/project/:id`, `GET /api/history/:id`,
  `POST /api/reanalyze`.
- **Frontend** (`app/*`): landing/dashboard.

### Esquema de datos (SQLite)
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY, url TEXT UNIQUE, owner TEXT, name TEXT, team TEXT
);
CREATE TABLE snapshots (
  id INTEGER PRIMARY KEY, project_id INTEGER, ts INTEGER, commit_sha TEXT,
  overall REAL, verdict TEXT, is_disguised_llm INTEGER, payload JSON
);
```

## 6. Frontend — estética y dashboard

**Dirección visual:** hacker / **BBS retro**. Fondo oscuro casi negro, **verde fósforo
fluorescente** (#00ff41 / #39ff14) como acento, tipografía **monoespaciada**, detalles
tipo terminal (cursor parpadeante, "scanlines" sutiles, bordes ASCII). **Pero limpio y con
los datos muy legibles** — el retro es la piel, no debe estorbar a la lectura del ranking.

Durante la implementación se usarán los skills de diseño instalados:
`frontend-design`, `high-end-visual-design`, `web-design-guidelines` (accesibilidad/contraste).

**Secciones del dashboard:**
- **Hero/Header**: título tipo terminal ("> AGENTIC_BENCHMARK"), reloj/última actualización.
- **Leaderboard**: ranking por nota global, con 🥇🥈🥉, barra de progreso por nota, badge rojo
  "⚠ LLM DISFRAZADO" cuando `is_disguised_llm` sea true.
- **Tarjeta de proyecto** (al hacer click): radar chart de las 6 dimensiones, justificaciones,
  highlights/red flags, último commit analizado.
- **Gráfica de evolución**: líneas temporales de la nota global de cada equipo a lo largo del día.
- **Botón "RE-ANALIZAR AHORA"**: dispara `POST /api/reanalyze`.

## 7. Manejo de errores
- Repo inaccesible (sin permisos / SSO): se marca como `error` en el dashboard, no rompe el ciclo.
- Repo demasiado grande para el presupuesto de tokens: el Packer trunca por prioridad
  (código de agente/tools primero; tests, docs y assets al final o fuera).
- Fallo del LLM / JSON inválido: reintento con backoff; si persiste, se conserva el último
  snapshot válido y se registra el error.
- Sin commits nuevos desde el último análisis: se omite el re-análisis (ahorra coste) salvo
  que se fuerce con "Re-analizar ahora".

## 8. Auth y secretos
- `gh auth login` para acceso a repos (incluye privados de la org; autorizar PAT/SSO si aplica).
- `ANTHROPIC_API_KEY` en `.env.local` (nunca commiteado). `.gitignore` incluye `.env*`,
  `workdir/`, `*.sqlite`.

## 9. Riesgos y mitigaciones (contexto hackathon, entrega mañana)
- **Tiempo:** alcance recortado a estático + histórico. Si va justo, el histórico se puede
  degradar a snapshot (la app sigue funcionando con una sola fila por repo).
- **Coste de tokens:** Sonnet 4.6 + omitir repos sin cambios + intervalo de 15 min.
- **Repos privados sin acceso:** se documenta y se marca el error; no bloquea al resto.

## 10. Criterios de éxito
- Para mañana en la presentación: cada repo de `repos.txt` tiene una nota global, un desglose
  por dimensiones con justificación, y una gráfica de evolución del día.
- El dashboard distingue visualmente y de un vistazo a los agentes reales de los "LLM disfrazados".

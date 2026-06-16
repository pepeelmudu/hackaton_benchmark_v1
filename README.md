# 🟢 AGENTIC_BENCHMARK

Evalúa cuán **agénticos** son los proyectos del hackathon (0–10) y los rankea en un
dashboard estilo BBS/terminal. Detecta el patrón "**LLM disfrazado de agente**".

## Cómo funciona

1. `repos.txt` lista los repos a evaluar (`url - equipo`).
2. El pipeline clona cada repo, empaqueta el código relevante y lo manda a Claude.
3. Claude puntúa 6 dimensiones (tool use, agency loop, planificación, memoria,
   integración, robustez) → nota global ponderada + justificaciones.
4. Cada análisis se guarda con timestamp → histórico de evolución.
5. El dashboard muestra ranking, dossier por proyecto (radar) y gráfica de evolución.

## Puesta en marcha

```bash
# 1. Dependencias (ya instaladas)
npm install

# 2. Credenciales
cp .env.example .env.local      # y rellena ANTHROPIC_API_KEY
#    Acceso a repos privados: o bien `gh auth login`,
#    o bien pon un GITHUB_TOKEN (scope repo) en .env.local

# 3. Borra los datos de DEMO antes del análisis real
rm -rf data/

# 4. Primer análisis
npm run analyze

# 5. Dashboard
npm run dev                     # http://localhost:3000

# 6. Para la "película" (histórico de evolución durante el día)
npm run watch                   # re-analiza cada 15 min
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run analyze` | Analiza todos los repos una vez (`--force` ignora el caché de commits) |
| `npm run watch` | Re-analiza cada 15 min y acumula histórico |
| `npm run dev` | Dashboard en localhost:3000 |
| `npm test` | Tests del core (ingest, store, rúbrica, packer) |
| `npm run seed` | Siembra datos de DEMO (solo para previsualizar la UI) |

## Notas

- `data/`, `workdir/` y `.env*` están en `.gitignore`.
- Si un repo no es accesible, se marca con error en el dashboard y no bloquea al resto.
- El análisis es **estático** (lee el código); no ejecuta los proyectos.

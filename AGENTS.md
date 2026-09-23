# AGENTS.md — Contexto para el agente de IA

Este archivo es el contexto que **GitHub Copilot (modo Agente)** y cualquier otro
asistente deben leer antes de trabajar en este repositorio.

---

## 1. Propósito

Repositorio del laboratorio **Lima 2026 — Observabilidad Agéntica con Dynatrace**.

El asistente al lab levanta un Codespace, se conecta al tenant de Dynatrace con
`dtctl` y usa un agente de IA para investigar problemas en lenguaje natural y
generar artefactos reales: un **RCA en Notebook**, un **dashboard** y una **alerta**.

- Guía del laboratorio (web): <https://edunzz.github.io/lima_2026/>
- Contenido de la guía: [`docs/steps.md`](docs/steps.md) — **única fuente de verdad**.

## 2. Tenant del laboratorio

| | |
|---|---|
| **Entorno** | `https://playground.apps.dynatrace.com/` |
| **Contexto dtctl** | `lab` |
| **Login** | `dtctl auth login --context lab --environment "https://playground.apps.dynatrace.com"` |

Este tenant es **compartido** con el resto de asistentes. Trátalo como un entorno
de producción ajeno: consulta libremente, pero **crea con cuidado y limpia al final**.

## 3. Cómo interactuar con Dynatrace: `dtctl`

**Toda** interacción con Dynatrace se hace con `dtctl`, nunca con `curl` a la API
ni con tokens escritos en archivos.

```bash
dtctl doctor                      # diagnóstico de instalación y autenticación
dtctl auth whoami                 # usuario y tenant activos
dtctl query '<DQL>'               # consultas DQL (tabla por defecto)
dtctl query '<DQL>' -o chart      # gráfico de líneas ASCII
dtctl query '<DQL>' -o barchart   # gráfico de barras ASCII
dtctl query '<DQL>' -o sparkline  # sparkline
```

Documentación: <https://dynatrace-oss.github.io/dtctl> · Repo: <https://github.com/dynatrace-oss/dtctl>

## 4. Skills `dt-*` disponibles

Las instala `.devcontainer/postCreate.sh` en `.github/skills/` desde
[`Dynatrace/dynatrace-for-ai`](https://github.com/Dynatrace/dynatrace-for-ai).
**Carga la skill del dominio ANTES de escribir DQL**: no inventes nombres de
campos, métricas ni entidades.

### Las que usa este laboratorio

| Skill | Para qué |
|---|---|
| `dt-dql-essentials` | Sintaxis DQL, patrones de consulta y optimización. Punto de partida de cualquier query. |
| `dt-obs-problems` | Problemas de Davis: causa raíz, impacto, entidades afectadas, histórico. |
| `dt-obs-logs` | Búsqueda de logs, patrones de error, tasas de error. |
| `dt-obs-services` | Métricas RED de servicios (requests, errores, latencia) y runtimes. |
| `dt-obs-hosts` | Métricas de hosts y procesos: CPU, memoria, disco, red. |
| `dt-obs-tracing` | Trazas y spans: dependencias, excepciones, cuellos de botella. |
| `dt-app-notebooks` | Crear y modificar Notebooks (JSON: secciones, DQL, visualizaciones). |
| `dt-app-dashboards` | Crear y modificar Dashboards (JSON: tiles, layout, variables). |
| `dt-alerting` | Detectores de anomalías, umbrales/baselines y notificaciones. |

### Resto del catálogo

| Dominio | Skills |
|---|---|
| Observabilidad | `dt-obs-analytics`, `dt-obs-frontends`, `dt-obs-genai`, `dt-obs-kubernetes`, `dt-obs-predictive-analytics`, `dt-obs-ext-monitors`, `dt-obs-network-devices`, `dt-obs-network-flows`, `dt-obs-compliance-assistant`, `dt-obs-log-semantic-mapping` |
| Cloud | `dt-obs-aws`, `dt-obs-azure`, `dt-obs-gcp` |
| Seguridad | `dt-sec-insights`, `dt-sec-contextualization`, `dt-sec-ioc-hunting`, `dt-sec-semantic-mapping` |
| Plataforma | `dt-platform-costs`, `dt-js-runtime`, `dt-migration` |
| Instrumentación | `dt-setup-oneagent`, `dt-setup-android`, `dt-setup-ios`, `dt-setup-flutter`, `dt-setup-react-native` |

Para ver las instaladas: `ls .github/skills`.

## 5. Reglas de trabajo

### 5.1 No inventes datos

- Los resultados vienen **siempre** de una ejecución real de `dtctl`. Nunca
  escribas cifras, IDs de problema, nombres de servicio ni enlaces «de ejemplo»
  como si fueran del tenant.
- Si una consulta DQL **no devuelve resultados, dilo explícitamente** («la
  consulta no devolvió filas para esa ventana de tiempo») y propón ajustar el
  rango o el filtro. No rellenes el hueco con datos plausibles.
- Muestra el DQL que ejecutaste. Si falla, muestra el error tal cual.

### 5.2 Antes de crear algo en el tenant, pide confirmación

El tenant es compartido. **Pregunta siempre antes** de crear, modificar o borrar
Notebooks, Dashboards, alertas o cualquier otro artefacto, y muestra qué vas a
crear antes de hacerlo.

### 5.3 Prefijo obligatorio `Lab - `

Todo artefacto creado durante el laboratorio se nombra con el prefijo `Lab - `:

- `Lab - RCA P-12345`
- `Lab - easytrade-frontend`
- `Lab - Failure rate /api/checkout`

Así se distingue de los artefactos reales del playground y se puede limpiar al final.

### 5.4 Consultas: empieza pequeño

Filtra pronto y usa ventanas de tiempo cortas (`from: now()-2h`). `fetch
metric.series` admite ventanas de **hasta 10 días**. Menos datos escaneados =
consultas más rápidas y más baratas.

### 5.5 Idioma

Todo el contenido visible del repositorio y las respuestas del agente van en
**español**.

## 6. Estructura del repositorio

```
.devcontainer/    devcontainer.json + postCreate.sh (instala dtctl y las skills dt-*)
.github/
  skills/         skills dt-* instaladas (no versionadas; las crea postCreate.sh)
  workflows/      pages.yml — publica docs/ en GitHub Pages
docs/             web estática de la guía (GitHub Pages)
  steps.md        ← CONTENIDO DEL LABORATORIO (única fuente de verdad)
  index.html      + assets/css, assets/js, assets/img
AGENTS.md         este archivo
README.md         cómo arrancar el lab
```

## 7. Si te piden editar la guía

El contenido vive **solo** en `docs/steps.md`. No hay que tocar HTML ni JS para
añadir o cambiar pasos. La gramática es:

```markdown
# {título del laboratorio}
inicio: {texto de la bolita verde inicial}   ← línea OPCIONAL
repo: usuario/repositorio                    ← línea OPCIONAL

## Links                                      ← sección OPCIONAL y RESERVADA
- **[Dynatrace Playground](https://playground.apps.dynatrace.com/)**
- [Otro enlace](https://…)

## {título del paso}
{markdown libre: párrafos, listas, tablas, código, imágenes}
```

- Un `##` = un nodo del flujo.
- **Excepción:** `## Links` (o `## Enlaces`) es una sección reservada que **no**
  crea nodo; sus enlaces se muestran en la barra superior de la guía y se abren
  en una pestaña nueva. Un enlace en **negrita** se resalta en ámbar.
- Los `##` dentro de un bloque de código se ignoran.
- Las imágenes van en `docs/assets/img/` y se referencian como
  `![alt](./assets/img/captura.png)`.
- **Nunca escribas la URL del repositorio a mano.** Usa los marcadores
  `{{repo_url}}`, `{{repo_clone_url}}`, `{{repo}}`, `{{owner}}`,
  `{{repo_name}}`, `{{pages_url}}` y `{{codespaces_url}}`: la guía los
  sustituye por los del repositorio que la sirve, así que un fork muestra sus
  propias URLs. La línea `repo:` permite fijarlo a mano si hace falta.

## 8. Limpieza al terminar

1. Borra del tenant todo lo creado con prefijo `Lab - `.
2. Detén o elimina el Codespace.

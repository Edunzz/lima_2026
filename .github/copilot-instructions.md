# Instrucciones para GitHub Copilot

El contexto completo de este repositorio está en **[`AGENTS.md`](../AGENTS.md)**.
Léelo antes de responder o ejecutar nada.

Resumen de lo imprescindible:

- Tenant del lab: `https://playground.apps.dynatrace.com/` (contexto `dtctl`: `lab`).
- Toda interacción con Dynatrace se hace con **`dtctl`**, nunca con `curl` a la API.
- Carga la skill `dt-*` del dominio **antes** de escribir DQL (`ls .github/skills`).
- **No inventes datos.** Si una consulta DQL no devuelve resultados, dilo explícitamente.
- El tenant es **compartido**: pide confirmación antes de crear Notebooks, dashboards
  o alertas, y nombra todo con el prefijo **`Lab - `**.
- Responde en **español**.

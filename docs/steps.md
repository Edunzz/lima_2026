# Guía de laboratorio — Lima 2026: Observabilidad Agéntica con Dynatrace
inicio: Ingresar al repositorio del lab

## Links

Estos enlaces se muestran en la barra superior y se abren en una pestaña nueva.
El que va en **negrita** se resalta en ámbar.

- **[Dynatrace Playground](https://playground.apps.dynatrace.com/)**
- [Repositorio del lab](https://github.com/Edunzz/lima_2026)
- [Documentación de dtctl](https://dynatrace-oss.github.io/dtctl)

## Antes de empezar

**Nivel:** Principiante · **Duración estimada:** 90–120 min
**Entorno:** GitHub Codespaces + Visual Studio Code + GitHub Copilot (modo Agente) + dtctl

| Dato | Valor |
|---|---|
| Repositorio | `https://github.com/Edunzz/lima_2026` |
| Tenant de Dynatrace | `https://playground.apps.dynatrace.com` |
| Herramientas | GitHub Codespaces, VS Code, GitHub Copilot (plan Free o superior), dtctl, Dynatrace Agent Skills (`dt-*`) |

En este laboratorio vas a levantar un entorno de desarrollo en la nube, conectarte al tenant de Dynatrace desde la terminal, investigar problemas en lenguaje natural con un agente de IA y generar artefactos reales: un RCA en Notebook, un dashboard y una alerta.

> 🧭 Usa el flujo de la izquierda para navegar. Marca cada paso como completado a medida que avances.

## Paso 1 — Acceso al repositorio

**Objetivo:** ubicar el repositorio base del laboratorio.

1. Inicia sesión en [GitHub](https://github.com).
2. Abre el repositorio: `https://github.com/Edunzz/lima_2026`.
3. Opcional pero recomendado: haz **Fork** para trabajar sobre tu propia copia.
4. Revisa rápidamente el `README.md` para ubicarte.

**Resultado esperado:** estás en la página principal del repositorio con tu sesión de GitHub iniciada.

## Paso 2 — Crear e iniciar el Codespace

**Objetivo:** levantar un entorno de desarrollo en la nube, listo para usar, sin instalar nada en tu equipo.

1. En la página del repositorio, haz clic en el botón verde **`< > Code`**.
2. Selecciona la pestaña **Codespaces**.
3. Haz clic en **Create codespace on main**.
4. Espera 1–3 minutos mientras se construye el entorno. Se abrirá VS Code en el navegador.
5. Al terminar, el script de post-creación habrá instalado **dtctl** y las **Dynatrace Agent Skills (`dt-*`)**. Verás un resumen en la terminal.

> 💡 Si no ves la terminal, abre el menú **☰ → Terminal → New Terminal** (o `` Ctrl + ` ``).

**Alternativa local:**

```bash
git clone https://github.com/Edunzz/lima_2026.git
cd lima_2026
code .   # luego: "Reopen in Container"
```

**Documentación oficial:**
- [Crear un codespace para un repositorio](https://docs.github.com/es/codespaces/developing-in-a-codespace/creating-a-codespace-for-a-repository)
- [Guía de inicio rápido de GitHub Codespaces](https://docs.github.com/es/codespaces/getting-started/quickstart)

**Resultado esperado:** VS Code abierto en el navegador con el repositorio cargado y una terminal disponible.

## Paso 3 — Check de prerrequisitos y componentes

**Objetivo:** confirmar que todas las piezas del laboratorio están instaladas y disponibles antes de empezar.

### 3.1 Diagnóstico de dtctl

```bash
dtctl doctor
```

**Resultado esperado:** un reporte de chequeos sobre la instalación y configuración de dtctl. En este punto es normal que la autenticación aparezca pendiente; se resuelve en el Paso 4.

### 3.2 Revisión del archivo `AGENTS.md`

1. En el explorador de archivos, abre `AGENTS.md` (en la raíz del repositorio).
2. Léelo: contiene las instrucciones y el contexto que el agente de Copilot usará durante el laboratorio.

**Resultado esperado:** el archivo existe y puedes ver su contenido.

### 3.3 Verificación de las Dynatrace Agent Skills en Copilot

1. Abre el panel de **Copilot Chat** (icono de Copilot en la barra lateral o `Ctrl + Alt + I`).
2. En el selector de modo del chat, elige **Agent**.
3. Escribe este prompt:

```text
Lista todas las skills disponibles en este workspace cuyo nombre empiece por "dt-" (skills de Dynatrace). Para cada una indica su nombre y una descripción de una línea.
```

**Resultado esperado:** un listado de skills como `dt-obs-problems`, `dt-obs-logs`, `dt-obs-services`, `dt-app-notebooks`, `dt-app-dashboards`, `dt-alerting`, `dt-dql-essentials`, entre otras.

**Documentación oficial:**
- [Modo Agente de Copilot en VS Code](https://code.visualstudio.com/docs/copilot/chat/chat-agent-mode)
- [Dynatrace for AI (repositorio de skills)](https://github.com/Dynatrace/dynatrace-for-ai)

## Paso 4 — dtctl: autenticación y exploración

**Objetivo:** conectarse al tenant de Dynatrace desde la terminal y consultar datos reales con dtctl.

> 📘 Referencia: [Documentación de dtctl](https://dynatrace-oss.github.io/dtctl) · [Repositorio dtctl](https://github.com/dynatrace-oss/dtctl)

### 4.1 Login con OAuth

```bash
dtctl auth login --context lab --environment "https://playground.apps.dynatrace.com"
```

1. dtctl abrirá (o mostrará) un enlace para iniciar sesión en el navegador.
2. Inicia sesión con tu usuario de Dynatrace y autoriza el acceso.
3. Vuelve a la terminal y valida la sesión:

```bash
dtctl auth whoami
dtctl doctor
```

**Resultado esperado:** `whoami` muestra tu usuario y el tenant; `doctor` ya no reporta errores de autenticación.

### 4.2 Últimos 5 problemas reportados

> ℹ️ En dtctl los problemas se consultan con DQL mediante `dtctl query`.

```bash
dtctl query 'fetch dt.davis.problems, from: now()-7d
| sort timestamp desc
| dedup display_id
| limit 5
| fields timestamp, display_id, event.name, event.status, event.category'
```

**Resultado esperado:** una tabla con los 5 problemas más recientes (abiertos o cerrados).

### 4.3 Logs recientes

```bash
dtctl query 'fetch logs, from: now()-1h
| filter loglevel == "ERROR"
| sort timestamp desc
| limit 10
| fields timestamp, loglevel, content'
```

**Resultado esperado:** una tabla con los últimos 10 logs de error.

### 4.4 Métricas en formato gráfico

CPU de hosts (gráfico de líneas ASCII):

```bash
dtctl query 'timeseries avg(dt.host.cpu.usage), from: now()-2h' -o chart
```

Tráfico de servicios (gráfico de barras ASCII):

```bash
dtctl query 'timeseries sum(dt.service.request.count), from: now()-2h' -o barchart
```

Tiempo de respuesta de servicios (sparkline):

```bash
dtctl query 'timeseries avg(dt.service.request.response_time), from: now()-2h' -o sparkline
```

**Resultado esperado:** gráficos dibujados directamente en la terminal.

## Paso 5 — Agentic: explorar problemas con Copilot

**Objetivo:** hacer lo mismo que en el Paso 4, pero en lenguaje natural a través del agente de Copilot, y profundizar en el análisis de problemas.

> Todos los prompts de este paso se escriben en **Copilot Chat → modo Agent**. Si el agente pide permiso para ejecutar un comando en la terminal, revisa el comando y aprueba.
> **Skills involucradas:** `dt-obs-problems`, `dt-obs-logs`, `dt-obs-services`, `dt-obs-hosts`.

### 5.1 Últimos 5 problemas del tenant

```text
Usando dtctl, lista los últimos 5 problemas del tenant de Dynatrace, estén activos o cerrados. Muéstralos en una tabla con: ID, título, estado, categoría, severidad y fecha de inicio.
```

### 5.2 Métricas promedio (sin gráficos)

```text
Usando dtctl, dame el promedio de CPU de los hosts y el tiempo de respuesta promedio y número total de requests de los servicios en las últimas 2 horas. Solo necesito los valores promedio en una tabla, sin gráficos.
```

### 5.3 Entidades afectadas por el problema más severo

```text
Del último problema activo con mayor severidad, identifica las entidades afectadas (servicios, hosts, procesos, etc.) y la entidad señalada como causa raíz. Presenta el resultado en una tabla.
```

### 5.4 Contexto con logs y eventos

```text
Toma el problema de mayor severidad detectado el día de ayer y compleméntalo con los logs de error y los eventos relacionados a las entidades afectadas en la ventana de tiempo del problema. Dame un resumen breve de qué ocurrió.
```

**Resultado esperado:** tablas y un resumen que correlaciona el problema con logs y eventos para entender mejor lo sucedido.

## Paso 6 — RCA publicado como Notebook

**Objetivo:** que el agente genere un análisis de causa raíz del último problema identificado y lo publique como un Notebook dentro de Dynatrace.

> **Skills involucradas:** `dt-obs-problems`, `dt-obs-logs` y `dt-app-notebooks`.

```text
Genera un análisis de causa raíz (RCA) del último problema identificado en el tenant de Dynatrace. Usa las skills dt-obs-problems y dt-obs-logs para investigar, y la skill dt-app-notebooks para publicar el resultado como un Notebook en Dynatrace usando dtctl.

El Notebook debe tener estas secciones, de forma puntual y concisa (no extensa):
1. Resumen ejecutivo
2. Análisis de causa raíz
3. Línea de tiempo de los sucesos
4. Brechas de observabilidad detectadas
5. Plan de acción

Nombra el Notebook como "Lab - RCA <ID del problema>". Cuando termines, dame el nombre del Notebook y el enlace para abrirlo.
```

**Resultado esperado:** un Notebook nuevo en Dynatrace con las 5 secciones, y el enlace para abrirlo desde el navegador.

## Paso 7 — Dashboard de servicio generado con IA

**Objetivo:** identificar un servicio relevante y crear, con un solo prompt, un dashboard básico en Dynatrace.

> **Skills involucradas:** `dt-obs-services`, `dt-obs-tracing`, `dt-obs-logs` y `dt-app-dashboards`.

### 7.1 Identificar un servicio importante

```text
Identifica los 5 servicios más importantes del tenant en las últimas 24 horas, considerando alto volumen de tráfico y cantidad de problemas asociados. Muéstralos en una tabla con: nombre, ID de entidad, total de requests, tasa de fallos y número de problemas. Recomiéndame uno para usar como ejemplo.
```

Anota el nombre del servicio elegido.

### 7.2 Crear el dashboard

```text
Crea un dashboard en Dynatrace con dtctl para el servicio <NOMBRE_DEL_SERVICIO>. Debe ser simple y básico, con:
- Métricas del servicio: requests, tiempo de respuesta y tasa de fallos.
- Excepciones capturadas en los spans del servicio.
- Logs asociados al servicio.

Nombre del dashboard: "Lab - <NOMBRE_DEL_SERVICIO>". Cuando termines, dame el enlace para abrirlo.
```

**Resultado esperado:** un dashboard nuevo en Dynatrace con las tres secciones y su enlace.

## Paso 8 — Alerta de tasa de fallos

**Objetivo:** crear una alerta sobre la tasa de fallos (errores 4xx/5xx) de un endpoint específico.

> **Skills involucradas:** `dt-obs-services` y `dt-alerting`.

### 8.1 Elegir un endpoint

```text
Para el servicio <NOMBRE_DEL_SERVICIO>, lista sus endpoints con mayor tráfico en las últimas 24 horas, indicando número de requests y tasa de fallos (errores 4xx y 5xx). Recomiéndame uno para crear una alerta.
```

### 8.2 Crear la alerta

```text
Crea una alerta en Dynatrace con dtctl (detector de anomalías) de tipo failure rate para el endpoint <NOMBRE_DEL_ENDPOINT> del servicio <NOMBRE_DEL_SERVICIO>. Debe dispararse cuando la tasa de fallos (errores 4xx/5xx) supere el 5% durante 5 minutos. Nombre: "Lab - Failure rate <NOMBRE_DEL_ENDPOINT>". Muéstrame la configuración creada y confirma que quedó activa.
```

**Resultado esperado:** un detector de anomalías creado y activo, con la configuración visible.

## Cierre y limpieza

Al finalizar el laboratorio habrás:

- Levantado un entorno completo en GitHub Codespaces con dtctl y las skills `dt-*`.
- Explorado el tenant de Dynatrace desde la terminal con dtctl.
- Investigado problemas en lenguaje natural con Copilot Agent.
- Generado un RCA como Notebook, un dashboard de servicio y una alerta de failure rate.

**Limpieza recomendada:**

1. El tenant es **compartido**: elimina el Notebook, el dashboard y la alerta que creaste (todos con prefijo `Lab - `).
2. Detén o elimina tu codespace para no consumir horas: [Detener un codespace](https://docs.github.com/es/codespaces/developing-in-a-codespace/stopping-and-starting-a-codespace).

> 🎉 ¡Gracias por participar en el Lab Lima 2026!

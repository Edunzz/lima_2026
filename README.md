# Lab Lima 2026 — Observabilidad Agéntica con Dynatrace, dtctl y GitHub Copilot

Laboratorio práctico de **nivel principiante** (90–120 min) para conectarte al
tenant de Dynatrace desde la terminal, investigar problemas en lenguaje natural
con un agente de IA y generar artefactos reales: un **RCA en Notebook**, un
**dashboard** y una **alerta de failure rate**.

### 👉 [Abrir la guía del laboratorio](https://edunzz.github.io/lima_2026/)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Edunzz/lima_2026?quickstart=1)

---

## Cómo empezar

### Opción A — Codespaces (recomendada)

No necesitas instalar nada en tu equipo.

1. *(Opcional pero recomendado)* Haz **Fork** del repositorio.
2. Pulsa el botón verde **`< > Code`**.
3. Ve a la pestaña **Codespaces** → **Create codespace on main**.
4. Espera 1–3 minutos: se abre VS Code en el navegador y `postCreate.sh` instala
   `dtctl` y las skills `dt-*`. Al final verás un resumen en la terminal.
5. Verifica el entorno:

   ```bash
   dtctl doctor
   ls .github/skills
   ```

### Opción B — Local con Dev Containers

Requiere [Docker](https://www.docker.com/) y la extensión
[Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).

```bash
git clone https://github.com/Edunzz/lima_2026.git
cd lima_2026
code .        # después: paleta de comandos → "Dev Containers: Reopen in Container"
```

## Ver la guía en local

```bash
python3 -m http.server 8000 --directory docs
```

Abre <http://localhost:8000>. En local la **auto-recarga** viene activada: edita
`docs/steps.md`, guarda y la web se actualiza sola en unos segundos.

> ⚠️ No abras `docs/index.html` haciendo doble clic. Con `file://` el navegador
> bloquea la lectura de `steps.md` y la guía no carga.

## Tenant del laboratorio

| | |
|---|---|
| **Entorno** | `https://playground.apps.dynatrace.com/` |
| **Login** | `dtctl auth login --context lab --environment "https://playground.apps.dynatrace.com"` |

El tenant es **compartido**. Nombra todo lo que crees con el prefijo `Lab - ` y
bórralo al terminar.

## Qué incluye el entorno

| Componente | Qué es | Cómo se comprueba |
|---|---|---|
| **dtctl** | CLI oficial de Dynatrace: auth, consultas DQL, notebooks, dashboards y alertas. | `dtctl version` · `dtctl doctor` |
| **Dynatrace Agent Skills (`dt-*`)** | 30+ skills que enseñan al agente a consultar Dynatrace correctamente (DQL, problemas, logs, servicios, notebooks…). | `ls .github/skills` |
| **GitHub Copilot (modo Agente)** | El agente que ejecuta `dtctl` por ti a partir de prompts en español. | Panel de Copilot → selector de modo → **Agent** |
| **VS Code Web** | Editor completo en el navegador, con terminal. | Se abre solo con el Codespace |

## Estructura del repositorio

```
lima_2026/
├─ .devcontainer/
│  ├─ devcontainer.json      # imagen, extensiones y ajustes del Codespace
│  └─ postCreate.sh          # instala dtctl + skills dt-* y valida el entorno
├─ .github/
│  ├─ copilot-instructions.md  # puntero a AGENTS.md
│  ├─ skills/                # skills dt-* instaladas (no versionadas)
│  └─ workflows/pages.yml    # publica docs/ en GitHub Pages
├─ docs/                     # raíz de la web (GitHub Pages)
│  ├─ index.html             # la guía (HTML + CSS + JS vanilla, sin build)
│  ├─ steps.md               # ← CONTENIDO DEL LAB: la única fuente de verdad
│  ├─ assets/css, assets/js  # estilos y lógica (parser, flujo, progreso)
│  └─ assets/img/            # capturas referenciadas desde steps.md
├─ AGENTS.md                 # contexto y reglas para el agente de IA
└─ README.md                 # este archivo
```

## Cómo editar la guía

**Todo el contenido vive en `docs/steps.md`. Edítalo y la web se actualiza.**
Un `##` = un paso del flujo. La línea `inicio:` define el nodo verde inicial.
No hay que tocar HTML ni JavaScript.

```markdown
# {título del laboratorio}
inicio: {texto de la bolita verde de inicio}   ← línea OPCIONAL
repo: usuario/repositorio                      ← línea OPCIONAL

## Links                                       ← sección OPCIONAL y RESERVADA
- **[Enlace destacado](https://…)**
- [Otro enlace](https://…)

## {título de la sección 1}
{contenido markdown libre: párrafos, listas, tablas, código, imágenes}

## {título de la sección 2}
{contenido…}
```

Detalles útiles:

- Los `###` y menores quedan **dentro** del paso; no crean nodos.
- Un `##` dentro de un bloque de código **no** crea un nodo.
- Si borras la línea `inicio:`, la bolita verde simplemente desaparece.
- **`## Links`** (o `## Enlaces`) es una sección reservada: **no** crea un paso.
  Sus enlaces salen en la barra superior y se abren en una pestaña nueva. El que
  pongas en **negrita** se resalta en ámbar (así está el Playground).
- La línea divisoria entre los dos paneles se arrastra con el ratón para dar más
  espacio al flujo o al contenido; doble clic la devuelve a su sitio y el ancho
  elegido se recuerda.
- **En móvil y tablet** manda el contenido del paso: el flujo se pliega tras el
  botón **☰ Pasos** de la barra superior, y los botones Anterior / Completado /
  Siguiente quedan fijos abajo.

### Marcadores: el repositorio se escribe solo

No escribas la URL del repositorio a mano en `steps.md`. Usa marcadores y la
guía los sustituye por los del repositorio que la está sirviendo, de modo que
**un fork muestra sus propias URLs sin tocar una línea de código**:

| Marcador | Se convierte en |
|---|---|
| `{{repo_url}}` | `https://github.com/usuario/repo` |
| `{{repo_clone_url}}` | `https://github.com/usuario/repo.git` |
| `{{repo}}` | `usuario/repo` |
| `{{owner}}` | `usuario` |
| `{{repo_name}}` | `repo` |
| `{{pages_url}}` | `https://usuario.github.io/repo/` |
| `{{codespaces_url}}` | `https://codespaces.new/usuario/repo?quickstart=1` |

```markdown
git clone {{repo_clone_url}}
cd {{repo_name}}
```

¿De dónde saca el repositorio? Por este orden:

1. La línea **`repo: usuario/repositorio`** de `steps.md`, si está.
2. **La propia URL**, cuando se sirve desde GitHub Pages
   (`https://maria.github.io/mi-lab/` → `maria/mi-lab`). Es lo que hace que un
   fork funcione solo.
3. El valor por defecto de `docs/assets/js/app.js`, que solo se usa en local o
   en Codespaces, donde la URL no dice de quién es el repositorio.

## Si haces un fork

1. **Fork** del repositorio.
2. **Settings → Pages → Source: GitHub Actions** (y activa Actions si el fork
   te lo pide). Tu guía quedará en `https://<tu-usuario>.github.io/<tu-repo>/`.
3. Edita `docs/steps.md` a tu gusto: **tu** Pages sirve **tu** contenido, porque
   la web lee `steps.md` con una ruta relativa.
4. Opcional, para que también el `README.md` y el `AGENTS.md` apunten a tu
   repositorio (GitHub los renderiza estáticos y no pueden sustituir nada en
   caliente):

   ```bash
   bash scripts/usar-mi-fork.sh          # deduce tu repo del remoto «origin»
   bash scripts/usar-mi-fork.sh tu/repo  # o se lo indicas tú
   ```

   Reescribe README, AGENTS y el valor por defecto, y fija la línea `repo:` en
   `steps.md`. Es idempotente y no toca el contenido del laboratorio.
- Imágenes: déjalas en `docs/assets/img/` y referencia
  `![alt](./assets/img/mi-captura.png)`. Se ven en grande al hacer clic.
- El progreso de cada persona se guarda en su navegador (`localStorage`).

## Publicación en GitHub Pages

El workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publica
`docs/` en cada push a `main`. **Configuración manual, una sola vez:**

> **Settings → Pages → Build and deployment → Source: GitHub Actions**

URL resultante: <https://edunzz.github.io/lima_2026/>

## Troubleshooting

<details>
<summary><b><code>dtctl: command not found</code></b></summary>

El instalador deja el binario en `~/.local/bin`. Abre una terminal nueva o ejecuta:

```bash
export PATH="$HOME/.local/bin:$PATH"
dtctl version
```

Si sigue sin aparecer, reinstala y observa la salida:

```bash
curl -fsSL https://raw.githubusercontent.com/dynatrace-oss/dtctl/main/install.sh | sh
```
</details>

<details>
<summary><b>No veo las skills <code>dt-*</code></b></summary>

Comprueba qué hay instalado:

```bash
ls .github/skills
```

Si está vacío, relanza la instalación completa (es idempotente):

```bash
bash .devcontainer/postCreate.sh
```

El script intenta primero el instalador oficial y, si no escribe nada, clona el
repositorio de skills directamente. Si ambos fallan (sin red, por ejemplo),
hazlo a mano:

```bash
git clone --depth 1 https://github.com/Dynatrace/dynatrace-for-ai /tmp/dt-ai
cp -r /tmp/dt-ai/skills/dt-* .github/skills/
```

Después, en Copilot Chat (modo **Agent**), pide: *«Lista las skills disponibles
cuyo nombre empiece por dt-»*. Si VS Code no las detecta, recarga la ventana
(**Developer: Reload Window**).
</details>

<details>
<summary><b>La guía no carga / <code>fetch</code> bloqueado por <code>file://</code></b></summary>

Abrir `docs/index.html` con doble clic no funciona: el navegador bloquea la
lectura de `steps.md` por CORS. Sírvela por HTTP:

```bash
python3 -m http.server 8000 --directory docs
```

y entra a <http://localhost:8000>. En el Codespace, el puerto 8000 se reenvía
solo (pestaña **Ports**).
</details>

<details>
<summary><b>GitHub Pages no publica</b></summary>

1. **Settings → Pages → Source** debe estar en **GitHub Actions** (no en «Deploy from a branch»).
2. El workflow solo corre en pushes a `main` que tocan `docs/**`. Lánzalo a mano
   desde **Actions → Deploy lab guide to GitHub Pages → Run workflow**.
3. En un fork, activa Actions primero (**Actions → I understand my workflows, go ahead**).
4. Revisa el log del job `deploy` en la pestaña **Actions**.
</details>

<details>
<summary><b>El Codespace no muestra terminal</b></summary>

Menú **☰ → Terminal → New Terminal**, o `` Ctrl + ` ``. Si el Codespace se quedó
a medias, ciérralo y créalo de nuevo; `postCreate.sh` está pensado para no
bloquear la creación aunque falle un instalador, así que el entorno siempre
termina de arrancar.
</details>

## Limpieza

1. **En el tenant** (es compartido): borra el Notebook, el dashboard y la alerta
   que creaste — todos llevan el prefijo `Lab - `.
2. **El Codespace**: detenlo o elimínalo para no consumir horas →
   [Detener un codespace](https://docs.github.com/es/codespaces/developing-in-a-codespace/stopping-and-starting-a-codespace).

---

## Materiales de la sesión

Guías y notebooks de referencia de *Practical AI for Observability: Dynatrace MCP in Action*:

- [Lima 2026: Dynatrace Remote MCP Server + Platform token + GitHub Copilot (VS Code)](https://playground.apps.dynatrace.com/ui/document/v0/#share=f5c0283d-37a2-4865-9f6a-a5953085f005)
- [Lima 2026: Dynatrace Local MCP Server + OAuth + GitHub Copilot (VS Code)](https://playground.apps.dynatrace.com/ui/document/v0/#share=3be7aeab-d814-43f8-82f1-1ca02775d573)
- [Lima 2026: Agente de IA + Skills (Dynatrace for AI) + dtctl](https://playground.apps.dynatrace.com/ui/document/v0/#share=f52a5690-43ef-4931-9a84-88d2d6bfd55b)
- [AI + MCP — Lab Guide + Queries](https://playground.apps.dynatrace.com/ui/apps/dynatrace.notebooks/notebook/58c1070e-ccb4-4b00-b525-1ace2db53e67#b372de7d-4ae7-4c57-b3d4-3ff32a9243a5)
- [Business Observability Dashboard](https://wkf10640.apps.dynatrace.com/ui/document/v0/#share=86f76953-25db-4d6f-a781-3c24233ec0f9) · [Skeleton](https://wkf10640.apps.dynatrace.com/ui/document/v0/#share=1ba18c2b-1ce3-4ea1-8ec2-47bb1cc4e982) · [Checkpoint 1](https://wkf10640.apps.dynatrace.com/ui/document/v0/#share=a8ecb052-ef42-478d-9d0f-ce870ddc4cd8) · [Checkpoint 2](https://wkf10640.apps.dynatrace.com/ui/document/v0/#share=ce5a3415-b64c-4a79-8fde-ed5c9cad2a10) · [Checkpoint 3/Final](https://wkf10640.apps.dynatrace.com/ui/document/v0/#share=8cf55353-7572-41b2-9526-8c120b3182c3)

# Installation / Instalação

[English README](../../README.md) · [README em português](../../README.pt-BR.md)

## Prerequisites

Validated on Windows 11 with Python **3.12.14**, Node **26.13.0** and npm **11.20.0**.
The setup helper requires Python 3.12. Tests import TypeScript directly through Node;
use the validated Node version for reproduction. Other versions/operating systems
are not certified by the recorded tests. No Codex installation is required.

Use a normal local project directory, Git, Python with `venv`/pip, and Node with npm.
Installation needs internet access to npm/PyPI. Runtime lab checks do not need OpenAI.

## Recommended Windows setup

Clone the repository or extract its reviewed source archive into a **new folder**.
Until the repository is public, cloning requires permission on the owner's account.

```powershell
git clone https://github.com/anjennlical/nekostrike.git
cd nekostrike
node --version
npm --version
py -3.12 --version
```

Find the full Python 3.12 executable path, then pass it explicitly:

```powershell
py -3.12 -c "import sys; print(sys.executable)"
node scripts/workspace.mjs setup --python "C:\path\printed\above\python.exe"
node scripts/workspace.mjs check
node scripts/workspace.mjs start
```

Replace the example path. The helper creates `.venv-independent`, installs the locked
Python dependencies and runs `npm ci`. It refuses existing environment/node_modules
directories to protect earlier work. `check` verifies tests, dependency consistency,
build, formatting and six local scenarios. `start` launches FastAPI on port 8000
and Vite on 5173, both bound to `127.0.0.1`.

Open **http://127.0.0.1:5173/#overview**. Keep the terminal open; Ctrl+C stops both
servers. On Windows, **Abrir NekoStrike.cmd** runs the same launcher after setup.

No `.env` is needed. A SQLite database is created locally under `backend/data/`.
The public source does not contain the author's history or her saved live AI response.

## Manual dependency installation and startup

If the helper does not match your Node/npm installation layout, these equivalent
commands make each step explicit. Use a fresh folder, Python 3.12 and the lockfiles.

```powershell
py -3.12 -m venv .venv-independent
.\.venv-independent\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
cd frontend
npm ci
npm run build
cd ..
```

Backend terminal, from the repository root:

```powershell
.\.venv-independent\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd frontend
npm run dev
```

Stop each terminal with Ctrl+C. Do not run manual servers and the combined launcher
at the same time. The frontend's `/api` proxy targets the fixed local port 8000.

## Tests and compiled preview

```powershell
node scripts/workspace.mjs check
node scripts/workspace.mjs start --preview
```

Compiled preview is **http://127.0.0.1:4173** and requires a successful frontend
build. It uses the real local backend, with AI still disabled unless explicitly configured.

For an isolated AI rehearsal instead, after building:

```powershell
.\.venv-independent\Scripts\python.exe backend/tools/mochi_ui_demo.py --case success --seed-history --port 4174
```

Open **http://127.0.0.1:4174/#mochi**. The provider is labeled **SIMULAÇÃO** and uses
a temporary database. It does not read `.env` or contact OpenAI. Stop with Ctrl+C.
Other cases: `disabled`, `missing_key`, `unavailable`, `timeout`, `invalid`; `--empty`
starts without seeded findings. These mocks do not prove live provider availability.

## Optional AI and backup

See [AI.md](AI.md) before configuring a provider. Never put a key in a `VITE_` variable.
Local backups can be created with `node scripts/workspace.mjs backup`; keep them
private and copy them to a destination you control. A same-machine backup is not
protection against losing that machine. Do not upload databases to GitHub.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Python opens the Microsoft Store | Use the actual Python 3.12 executable path, not the Windows alias |
| `npm.ps1` blocked by PowerShell policy | Use `npm.cmd`; do not weaken security policy |
| Setup says environment already exists | Use a fresh source folder; do not delete a working setup or personal database |
| Node rejects `.ts` imports | Check the validated Node version; tests require native TypeScript support |
| Port 8000/5173/4173/4174 occupied | Stop only your known server terminal or use the existing session; do not kill unknown processes |
| Backend offline | Confirm FastAPI is running and `/api/health` is reachable through the frontend proxy |
| AI disabled | Expected default; lab, history and deterministic reports still work |
| No saved analysis | Fresh installations have no private history; analyses are associated with finding IDs, not titles |
| Old UI in preview | Rebuild, then reload the local page; Vite dev and compiled preview are different modes |

## Passo a passo em português

1. Instale Python 3.12 e a versão do Node validada acima, com npm. Não precisa do Codex.
2. Clone ou extraia em pasta nova. Descubra o caminho do Python com o comando mostrado.
3. Execute `setup --python`, depois `check` e `start`, na raiz do projeto.
4. Abra `127.0.0.1:5173`; Ctrl+C encerra. O arquivo CMD simplifica os próximos usos.
5. Comece sem `.env`: os três verificadores, histórico, revisão e Markdown funcionam sem IA.
6. Para ensaiar respostas sem custo, use a demonstração simulada em 4174.

Nunca apague o banco para resolver problemas de instalação. Não altere políticas de
segurança do Windows. Autenticação no GitHub e chave OpenAI são coisas diferentes;
nenhuma senha ou chave deve ser enviada em chat, README ou issue.

# ModelBench Local

A local AI prompt testing playground that only allows OpenRouter free models.

![ModelBench Local English playground preview](public/modelbench-preview-en.png)

The interface, starter prompt, validation messages, and application metadata are in English. Model responses follow your prompt and the selected model.

## Features and scope

- Run one prompt at a time against a selected free model or Free Router.
- View the resolved model, request latency, input/output tokens, and reported cost.
- Read answers with Markdown headings, lists, bold text, code blocks, and tables.
- Restore any of the eight most recent successful runs, or clear local history.
- See a warning when a response reaches its output token limit.

Test suites, batch runs, and result comparison are placeholders and are not yet implemented. Responses are displayed after the request finishes; streaming is not supported.

## Technology

| Technology | Purpose |
| --- | --- |
| Next.js 16 + React 19 | Web interface, component state, and local API routes |
| TypeScript 5 | Types and API data modeling |
| Vinext + Vite 8 | Development server and production builds |
| Tailwind CSS 4 + custom CSS | Responsive layouts and styling |
| OpenRouter API | Discover free models and run prompt tests |
| OpenAPI 3.1 | Describe `/api/models` and `/api/chat` |
| react-markdown + remark-gfm | Render Markdown answers and tables |
| Web Storage | API key in `sessionStorage`; recent runs in `localStorage` |
| pnpm | Dependency and script management |

No cloud database is required. The interface, API proxy, and cost protection run locally. Model discovery and inference requests are sent to OpenRouter.

## Project structure

```text
modelbench-local/
├── app/page.tsx             # ModelBench playground
├── app/layout.tsx           # English metadata and document language
├── app/api/models/route.ts  # Discover and filter free models
├── app/api/chat/route.ts    # Verify free models and proxy requests
├── start-local.ps1          # Windows launcher with a bundled-runtime fallback
├── public/                 # Static assets
└── openapi.yaml             # OpenAPI 3.1 specification
```

## Run locally

1. Install Node.js 22.13 or later and pnpm.
2. Run `pnpm install` in this directory.
3. Run `pnpm dev`.
4. Open the localhost URL printed in the terminal.
5. Create an API key in [OpenRouter settings](https://openrouter.ai/settings/keys), then enter it in the interface.

### Windows PowerShell

From the project directory, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

The launcher uses Node.js and pnpm from your PATH, with a fallback to the Codex bundled runtime under your Windows user profile when available. That fallback is specific to computers with the bundled runtime installed. On other computers, install Node.js 22.13 or later and pnpm first. Run `pnpm install` before the first launch on a fresh clone.

Open the localhost address printed in the terminal. Keep the terminal open while using the app; press **Ctrl+C** to stop it.

### Production build

```sh
pnpm build
pnpm start
```

The API key is stored only in the browser's `sessionStorage`; it is not written to project files or run history. Closing the tab clears the session. Up to eight recent runs are stored locally. Use **Clear history** to remove them.

The server checks the current pricing of explicitly selected `:free` models before each request and rejects models that are not verified as free. The `openrouter/free` router is also allowed.

Cost is displayed from the API's reported usage. Missing cost is shown as **Not reported**, rather than assumed to be zero. Historical records created by older versions may contain a zero that was used as a fallback; run a new test for current usage reporting.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `pnpm` is not recognized | Use the Windows launcher above, or install pnpm and reopen your terminal. |
| The page does not open | Keep the server running and use its printed URL; the port may differ if another app is already using it. |
| Free models cannot be loaded | Check connectivity to OpenRouter and retry by reloading the page. |
| A request fails | Read the displayed error, verify your API key, try another free model, or retry later. |
| Cost protection blocks a model | Reload the model list and select a currently verified free model. |
| An answer is cut off | Increase **Max tokens** (up to 4,096) or ask for a shorter answer. A token-limit warning appears when the API reports this condition. |

Model output and usage fields depend on the upstream response. Prompts and answers are stored in browser history, so **Clear history** removes those local records. Raw HTML in model answers is not rendered.

## Validation

```sh
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Prompts are limited to 30,000 characters per request. Temperature is bounded to 0–2, and maximum output tokens to 1–4,096.

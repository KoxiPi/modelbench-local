'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatCost } from './lib/format-cost';

type FreeModel = { id: string; name: string; contextLength?: number };
type ChatResult = {
  text: string;
  requestedModel: string;
  resolvedModel: string;
  durationMs: number;
  finishReason?: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; cost?: number };
};
type RunHistory = ChatResult & { id: string; createdAt: string; prompt: string };

const STARTER_PROMPT = 'Explain in three bullet points why AI models should be tested before going into production.';

function formatNumber(value?: number) {
  return typeof value === 'number' ? value.toLocaleString('en-US') : '—';
}

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<FreeModel[]>([]);
  const [model, setModel] = useState('openrouter/free');
  const [prompt, setPrompt] = useState(STARTER_PROMPT);
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(800);
  const [loadingModels, setLoadingModels] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ChatResult | null>(null);
  const [history, setHistory] = useState<RunHistory[]>([]);

  useEffect(() => {
    // Restore browser-only session data after hydration to keep server and client markup consistent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(sessionStorage.getItem('openrouter_api_key') ?? '');
    try {
      setHistory(JSON.parse(localStorage.getItem('model_testing_history') ?? '[]'));
    } catch {
      setHistory([]);
    }
    fetch('/api/models')
      .then(async (response) => {
        const body = await response.json() as { models: FreeModel[]; error?: string };
        if (!response.ok) throw new Error(body.error || 'Unable to load free models');
        setModels(body.models);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load free models'))
      .finally(() => setLoadingModels(false));
  }, []);

  const selectedModel = useMemo(() => models.find((item) => item.id === model), [model, models]);

  function updateApiKey(value: string) {
    setApiKey(value);
    if (value) sessionStorage.setItem('openrouter_api_key', value);
    else sessionStorage.removeItem('openrouter_api_key');
  }

  async function runTest(event: FormEvent) {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!apiKey.trim()) {
      setError('Enter your OpenRouter API key first. It is stored only for this browser session.');
      return;
    }
    if (!prompt.trim()) {
      setError('Enter a test prompt.');
      return;
    }
    setRunning(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model, prompt, temperature, maxTokens }),
      });
      const body = await response.json() as ChatResult & { error?: string };
      if (!response.ok) throw new Error(body.error || 'Model request failed');
      const nextResult = body as ChatResult;
      setResult(nextResult);
      const nextHistory = [{ ...nextResult, id: crypto.randomUUID(), createdAt: new Date().toISOString(), prompt }, ...history].slice(0, 8);
      setHistory(nextHistory);
      localStorage.setItem('model_testing_history', JSON.stringify(nextHistory));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Model request failed');
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div><strong>ModelBench</strong><span>Local AI model playground</span></div>
        </div>
        <div className="topbar-meta"><span className="status-dot" /><span>Localhost</span><span className="free-badge">Free models only</span></div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          <button className="nav-item active"><span>⌁</span> Playground</button>
          <button className="nav-item" disabled><span>▦</span> Test suites <em>Coming soon</em></button>
          <button className="nav-item" disabled><span>↗</span> Batch runs</button>
          <button className="nav-item" disabled><span>◫</span> Compare results</button>
          <div className="sidebar-note"><span>Privacy note</span><p>The app runs locally. Prompts are sent to online models through OpenRouter.</p></div>
        </aside>

        <section className="content">
          <div className="page-heading">
            <div><p className="eyebrow">PLAYGROUND · ONLINE FREE</p><h1>Test your prompts for free</h1><p>Choose a free model and track its response, latency, and token usage.</p></div>
            <a className="text-link" href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">Get an API key ↗</a>
          </div>

          <form className="test-grid" onSubmit={runTest}>
            <div className="panel composer-panel">
              <div className="panel-title"><div><span className="step-number">01</span><h2>Test input</h2></div><span className="safe-label">Cost protection on</span></div>
              <label className="field">
                <span>OpenRouter API Key</span>
                <input type="password" value={apiKey} onChange={(event) => updateApiKey(event.target.value)} placeholder="sk-or-v1-..." autoComplete="off" />
                <small>Stored only for this browser session; cleared when you close the tab.</small>
              </label>
              <div className="field-row">
                <label className="field grow">
                  <span>Free model</span>
                  <select value={model} onChange={(event) => setModel(event.target.value)} disabled={loadingModels}>
                    <option value="openrouter/free">Free Router · Random free model</option>
                    {models.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.id}</option>)}
                  </select>
                </label>
                <div className="context-chip"><span>Context</span><strong>{selectedModel?.contextLength ? `${Math.round(selectedModel.contextLength / 1000)}K` : 'Auto'}</strong></div>
              </div>
              <label className="field prompt-field">
                <span>Prompt</span>
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={9} />
                <small className="character-count">{prompt.length} characters</small>
              </label>
              <div className="parameter-row">
                <label className="compact-field"><span>Temperature</span><input type="number" min="0" max="2" step="0.1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} /></label>
                <label className="compact-field"><span>Max tokens</span><input type="number" min="1" max="4096" step="1" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} /></label>
                <button className="run-button" type="submit" disabled={running}>{running ? <><span className="spinner" /> Running</> : <>Run test <span>→</span></>}</button>
              </div>
              {error && <p className="error-message" role="alert">{error}</p>}
            </div>

            <div className="panel result-panel">
              <div className="panel-title"><div><span className="step-number">02</span><h2>Model output</h2></div>{result && <span className="success-label">Success</span>}</div>
              {!result && !running && <div className="empty-result"><span className="empty-glyph">◎</span><h3>Ready for your first run</h3><p>Enter your API key and run a test to see the response and metrics here.</p></div>}
              {running && <div className="empty-result"><span className="large-spinner" /><h3>Waiting for the model</h3><p>Free online models may take longer during peak hours.</p></div>}
              {result && (
                <div className="result-content">
                  <div className="metrics">
                    <div><span>Latency</span><strong>{(result.durationMs / 1000).toFixed(2)}s</strong></div>
                    <div><span>Input tokens</span><strong>{formatNumber(result.usage?.promptTokens)}</strong></div>
                    <div><span>Output tokens</span><strong>{formatNumber(result.usage?.completionTokens)}</strong></div>
                    <div><span>Cost</span><strong className={result.usage?.cost === 0 ? 'zero-cost' : undefined}>{formatCost(result.usage?.cost)}</strong></div>
                  </div>
                  <div className="resolved-model"><span>Resolved model</span><code>{result.resolvedModel}</code></div>
                  {result.finishReason === 'length' && <p className="output-notice" role="status">The response reached its token limit and may be incomplete. Increase Max tokens and try again.</p>}
                  <article className="answer"><Markdown remarkPlugins={[remarkGfm]} skipHtml>{result.text}</Markdown></article>
                </div>
              )}
            </div>
          </form>

          {history.length > 0 && (
            <section className="history-section">
              <div className="history-heading"><div><p className="eyebrow">LOCAL HISTORY</p><h2>Recent runs</h2></div><button onClick={() => { setHistory([]); localStorage.removeItem('model_testing_history'); }}>Clear history</button></div>
              <div className="history-list">
                {history.map((item) => (
                  <button key={item.id} onClick={() => { setResult(item); setPrompt(item.prompt); }}>
                    <span className="history-status">✓</span><span className="history-main"><strong>{item.resolvedModel}</strong><small>{item.prompt}</small></span><span className="history-time">{(item.durationMs / 1000).toFixed(2)}s</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

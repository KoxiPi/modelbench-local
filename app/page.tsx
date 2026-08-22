'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type FreeModel = { id: string; name: string; contextLength?: number };
type ChatResult = {
  text: string;
  requestedModel: string;
  resolvedModel: string;
  durationMs: number;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number; cost?: number };
};
type RunHistory = ChatResult & { id: string; createdAt: string; prompt: string };

const STARTER_PROMPT = '请用三个要点解释：为什么在正式上线前需要对 AI 模型进行测试？';

function formatNumber(value?: number) {
  return typeof value === 'number' ? value.toLocaleString('zh-CN') : '—';
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
    setApiKey(sessionStorage.getItem('openrouter_api_key') ?? '');
    try {
      setHistory(JSON.parse(localStorage.getItem('model_testing_history') ?? '[]'));
    } catch {
      setHistory([]);
    }
    fetch('/api/models')
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || '无法获取免费模型');
        setModels(body.models);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : '无法获取免费模型'))
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
      setError('请先填写 OpenRouter API Key。它只保存在当前浏览器会话中。');
      return;
    }
    if (!prompt.trim()) {
      setError('请输入测试 Prompt。');
      return;
    }
    setRunning(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model, prompt, temperature, maxTokens }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || '模型调用失败');
      const nextResult = body as ChatResult;
      setResult(nextResult);
      const nextHistory = [{ ...nextResult, id: crypto.randomUUID(), createdAt: new Date().toISOString(), prompt }, ...history].slice(0, 8);
      setHistory(nextHistory);
      localStorage.setItem('model_testing_history', JSON.stringify(nextHistory));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '模型调用失败');
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div><strong>ModelBench</strong><span>本地 AI 模型测试台</span></div>
        </div>
        <div className="topbar-meta"><span className="status-dot" /><span>Localhost</span><span className="free-badge">仅免费模型</span></div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="主导航">
          <p className="nav-label">工作区</p>
          <button className="nav-item active"><span>⌁</span> Playground</button>
          <button className="nav-item" disabled><span>▦</span> 测试集 <em>即将推出</em></button>
          <button className="nav-item" disabled><span>↗</span> 批量运行</button>
          <button className="nav-item" disabled><span>◫</span> 结果对比</button>
          <div className="sidebar-note"><span>隐私提示</span><p>应用在本地运行，但 Prompt 会发送给 OpenRouter 的在线模型。</p></div>
        </aside>

        <section className="content">
          <div className="page-heading">
            <div><p className="eyebrow">PLAYGROUND · ONLINE FREE</p><h1>用零成本验证你的 Prompt</h1><p>选择一个明确的免费模型，记录响应、耗时与 Token 使用量。</p></div>
            <a className="text-link" href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">获取 API Key ↗</a>
          </div>

          <form className="test-grid" onSubmit={runTest}>
            <div className="panel composer-panel">
              <div className="panel-title"><div><span className="step-number">01</span><h2>测试输入</h2></div><span className="safe-label">费用保护已开启</span></div>
              <label className="field">
                <span>OpenRouter API Key</span>
                <input type="password" value={apiKey} onChange={(event) => updateApiKey(event.target.value)} placeholder="sk-or-v1-..." autoComplete="off" />
                <small>仅保存在当前浏览器会话；关闭标签页后清除。</small>
              </label>
              <div className="field-row">
                <label className="field grow">
                  <span>免费模型</span>
                  <select value={model} onChange={(event) => setModel(event.target.value)} disabled={loadingModels}>
                    <option value="openrouter/free">Free Router · 随机免费模型</option>
                    {models.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.id}</option>)}
                  </select>
                </label>
                <div className="context-chip"><span>上下文</span><strong>{selectedModel?.contextLength ? `${Math.round(selectedModel.contextLength / 1000)}K` : '自动'}</strong></div>
              </div>
              <label className="field prompt-field">
                <span>Prompt</span>
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={9} />
                <small className="character-count">{prompt.length} 字符</small>
              </label>
              <div className="parameter-row">
                <label className="compact-field"><span>Temperature</span><input type="number" min="0" max="2" step="0.1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} /></label>
                <label className="compact-field"><span>Max tokens</span><input type="number" min="1" max="4096" step="1" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} /></label>
                <button className="run-button" type="submit" disabled={running}>{running ? <><span className="spinner" /> 正在运行</> : <>运行测试 <span>→</span></>}</button>
              </div>
              {error && <p className="error-message" role="alert">{error}</p>}
            </div>

            <div className="panel result-panel">
              <div className="panel-title"><div><span className="step-number">02</span><h2>模型输出</h2></div>{result && <span className="success-label">成功</span>}</div>
              {!result && !running && <div className="empty-result"><span className="empty-glyph">◎</span><h3>等待第一次运行</h3><p>填写 API Key 并运行测试后，模型回答和测量数据会显示在这里。</p></div>}
              {running && <div className="empty-result"><span className="large-spinner" /><h3>正在等待模型响应</h3><p>免费在线模型在高峰期可能需要更长时间。</p></div>}
              {result && (
                <div className="result-content">
                  <div className="metrics">
                    <div><span>总耗时</span><strong>{(result.durationMs / 1000).toFixed(2)}s</strong></div>
                    <div><span>输入 Token</span><strong>{formatNumber(result.usage?.promptTokens)}</strong></div>
                    <div><span>输出 Token</span><strong>{formatNumber(result.usage?.completionTokens)}</strong></div>
                    <div><span>费用</span><strong className="zero-cost">$0.00</strong></div>
                  </div>
                  <div className="resolved-model"><span>实际模型</span><code>{result.resolvedModel}</code></div>
                  <article className="answer">{result.text}</article>
                </div>
              )}
            </div>
          </form>

          {history.length > 0 && (
            <section className="history-section">
              <div className="history-heading"><div><p className="eyebrow">LOCAL HISTORY</p><h2>最近运行</h2></div><button onClick={() => { setHistory([]); localStorage.removeItem('model_testing_history'); }}>清空记录</button></div>
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

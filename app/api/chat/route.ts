type OpenRouterModel = { id: string; pricing?: Record<string, string | number | null> };

function hasZeroPricing(pricing?: OpenRouterModel['pricing']) {
  if (!pricing) return false;
  const values = Object.values(pricing).filter((value) => value !== null && value !== undefined);
  return values.length > 0 && values.every((value) => Number(value) === 0);
}

async function assertFreeModel(model: string) {
  if (model === 'openrouter/free') return;
  if (!model.endsWith(':free')) throw new Error('费用保护：只允许调用 :free 免费模型。');
  const response = await fetch('https://openrouter.ai/api/v1/models', { cache: 'no-store' });
  if (!response.ok) throw new Error('费用保护：暂时无法验证模型价格，请稍后重试。');
  const payload = (await response.json()) as { data?: OpenRouterModel[] };
  const selected = payload.data?.find((item) => item.id === model);
  if (!selected || !hasZeroPricing(selected.pricing)) throw new Error('费用保护：该模型当前未被确认是免费模型，已阻止请求。');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apiKey?: string; model?: string; prompt?: string; temperature?: number; maxTokens?: number };
    const apiKey = body.apiKey?.trim();
    const model = body.model?.trim();
    const prompt = body.prompt?.trim();
    if (!apiKey || !model || !prompt) return Response.json({ error: 'API Key、模型和 Prompt 都不能为空。' }, { status: 400 });
    if (prompt.length > 30_000) return Response.json({ error: '初版单次 Prompt 最多支持 30,000 个字符。' }, { status: 400 });
    await assertFreeModel(model);

    const startedAt = Date.now();
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-OpenRouter-Title': 'ModelBench Local' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: Math.min(2, Math.max(0, Number(body.temperature ?? 0.3))),
        max_tokens: Math.min(4096, Math.max(1, Number(body.maxTokens ?? 800))),
        stream: false,
      }),
    });
    const durationMs = Date.now() - startedAt;
    const payload = await upstream.json() as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cost?: number };
      error?: { message?: string };
    };
    if (!upstream.ok) return Response.json({ error: payload.error?.message || `OpenRouter 返回 ${upstream.status}` }, { status: upstream.status });

    return Response.json({
      text: payload.choices?.[0]?.message?.content || '模型没有返回文本内容。',
      requestedModel: model,
      resolvedModel: payload.model || model,
      durationMs,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        cost: payload.usage?.cost ?? 0,
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '请求处理失败。' }, { status: 500 });
  }
}

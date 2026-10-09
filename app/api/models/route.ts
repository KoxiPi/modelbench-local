type OpenRouterModel = { id: string; name?: string; context_length?: number; pricing?: Record<string, string | number | null> };

function hasZeroPricing(pricing?: OpenRouterModel['pricing']) {
  if (!pricing) return false;
  const values = Object.values(pricing).filter((value) => value !== null && value !== undefined);
  return values.length > 0 && values.every((value) => Number(value) === 0);
}

export async function GET() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) throw new Error(`OpenRouter returned ${response.status}`);
    const payload = (await response.json()) as { data?: OpenRouterModel[] };
    const models = (payload.data ?? [])
      .filter((item) => item.id.endsWith(':free') && hasZeroPricing(item.pricing))
      .map((item) => ({ id: item.id, name: item.name || item.id, contextLength: item.context_length }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ models }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: `Unable to connect to OpenRouter: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 502 });
  }
}

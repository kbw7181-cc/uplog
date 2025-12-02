// src/lib/uplogApi.ts
export async function getAiRebuttals(options: {
  customerSaying: string;
  productType?: string;
  tone?: string;
}) {
  const res = await fetch('/api/ai-rebuttal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'AI 반론 생성 실패');
  }

  return data as { suggestions: string[] };
}

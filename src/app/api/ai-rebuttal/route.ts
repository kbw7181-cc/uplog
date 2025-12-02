// src/app/api/ai-rebuttal/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      customerSaying,
      productType,
      tone,
    } = body as {
      customerSaying: string;
      productType?: string;
      tone?: string;
    };

    if (!customerSaying) {
      return NextResponse.json(
        { error: 'customerSaying은 필수입니다.' },
        { status: 400 },
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content:
            '너는 한국 보험/금융/세일즈 상담원을 코칭하는 "스토리텔링 반론 코치"야. ' +
            '항상 고객의 감정을 먼저 인정하고, 짧은 상황/장면이 떠오르도록 이야기처럼 풀어서 말해. ' +
            '문장은 2~4문장 정도, 존댓말만 사용하고, 과한 압박·죄책감 유도는 금지. ' +
            '각 멘트는 ①공감 → ②짧은 사례/비유 또는 전후 비교 → ③부드러운 제안 순서로 구성해.',
        },
        {
          role: 'user',
          content: `
고객이 한 말: "${customerSaying}"

상품/상황: "${productType || '일반 세일즈'}"
톤: "${tone || '부드럽고 공감 먼저, 스토리텔링 활용'}"

위 상황에서 사용할 수 있는 "반론 멘트"를 3개 제안해줘.
요청:
- 각 멘트는 2~4문장 정도로, 이야기하듯 자연스럽게.
- 첫 문장은 반드시 고객 감정을 인정/공감하는 문장으로 시작.
- 중간에는 짧은 사례, 비유, 또는 전후 비교를 넣어서 장면이 그려지게.
- 마지막 문장은 고객을 존중하면서도, 한 번 더 생각해 볼 수 있게 부드럽게 제안.

반환 형식:
1. 멘트1
2. 멘트2
3. 멘트3

이런 식으로 번호 + 텍스트만 출력해줘.
          `.trim(),
        },
      ],
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? '';

    // "1. ..." "2. ..." 형태를 3개로 잘라내기
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const suggestions: string[] = [];
    let buffer = '';

    for (const line of lines) {
      if (/^[0-9]+\./.test(line)) {
        if (buffer) suggestions.push(buffer.trim());
        buffer = line.replace(/^[0-9]+\.\s*/, '');
      } else {
        buffer += (buffer ? ' ' : '') + line;
      }
    }
    if (buffer) suggestions.push(buffer.trim());

    const top3 = suggestions.slice(0, 3);

    if (top3.length === 0) {
      return NextResponse.json(
        { error: 'AI 반론 생성에 실패했습니다.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ suggestions: top3 });
  } catch (e: any) {
    console.error('AI rebuttal error', e);
    return NextResponse.json(
      { error: e?.message ?? '알 수 없는 오류' },
      { status: 500 },
    );
  }
}

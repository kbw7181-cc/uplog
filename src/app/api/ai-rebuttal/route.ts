// ✅✅✅ 전체복붙: src/app/api/ai-rebuttal/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ReqBody = {
  type?: string;       // 예: "가격 부담"
  objection?: string;  // 고객 거절 문장
  product?: string;    // (선택) 상품/서비스
  tone?: string;       // (선택) 말투/톤
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    // ✅ 키 없으면 빌드는 통과 + 런타임에서만 안내
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: 'OPENAI_API_KEY가 설정되지 않았습니다. (Vercel 환경변수에 추가 필요)',
        },
        { status: 501 }
      );
    }

    const body = (await req.json()) as ReqBody;

    // ✅ OpenAI는 "요청 시점"에만 생성 (모듈 로드시 생성 금지)
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey });

    const type = (body.type ?? '').trim();
    const objection = (body.objection ?? '').trim();
    const product = (body.product ?? '').trim();
    const tone = (body.tone ?? '친절하고 자신감 있게').trim();

    const prompt = `
너는 세일즈 코치다. 아래 고객 거절/반론 상황에 대해, 즉시 말할 수 있는 짧고 실전적인 답변을 작성해라.
- 유형: ${type || '(미지정)'}
- 고객 거절: ${objection || '(미지정)'}
- 상품/서비스: ${product || '(미지정)'}
- 톤: ${tone}

요구사항:
1) 2~4문장, 너무 길지 않게
2) 공감 1문장 + 제안/질문 1~2문장
3) 과장/허위 금지, 예의 있게
4) 마지막은 질문으로 마무리
`.trim();

    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '너는 실전 영업 코치다.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 250,
    });

    const text = res.choices?.[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    console.error('[ai-rebuttal] error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'AI 응답 생성 중 오류' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // 헬스체크용
  return NextResponse.json({ ok: true, route: '/api/ai-rebuttal' });
}

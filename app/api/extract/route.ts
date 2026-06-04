import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { ExtractionResultSchema } from '@/lib/schema';
import { EXTRACTION_TOOL, SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from '@/lib/prompt';

export const runtime = 'nodejs';
export const maxDuration = 120;

const DEFAULT_MODEL = 'claude-opus-4-8';

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not set on the server.' },
      { status: 500 }
    );
  }

  let body: { text?: string; filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const text = (body.text ?? '').trim();
  if (!text) {
    return NextResponse.json(
      { error: 'No document text supplied. Provide `text`.' },
      { status: 400 }
    );
  }
  if (text.length > 200_000) {
    return NextResponse.json(
      {
        error: `Document text is ${text.length} characters; cap is 200,000. Split the document or paste a relevant excerpt.`,
      },
      { status: 413 }
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: EXTRACTION_TOOL.name },
      messages: [{ role: 'user', content: USER_PROMPT_TEMPLATE(text) }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Anthropic error.';
    return NextResponse.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }

  const toolUse = response.content.find(
    (block): block is Extract<typeof block, { type: 'tool_use' }> =>
      block.type === 'tool_use' && block.name === EXTRACTION_TOOL.name
  );
  if (!toolUse) {
    return NextResponse.json(
      { error: 'Model did not call the extraction tool. Try again.' },
      { status: 502 }
    );
  }

  const parsed = ExtractionResultSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Model output failed schema validation.',
        details: parsed.error.flatten(),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    obligations: parsed.data.obligations,
    model,
    usage: response.usage,
    filename: body.filename ?? null,
  });
}

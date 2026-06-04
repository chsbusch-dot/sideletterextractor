import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { ExtractionResultSchema } from '@/lib/schema';
import {
  EXTRACTION_TOOL,
  SYSTEM_PROMPT,
  USER_PROMPT_PDF_INTRO,
  USER_PROMPT_TEXT,
} from '@/lib/prompt';

export const runtime = 'nodejs';
export const maxDuration = 180;

const DEFAULT_MODEL = 'claude-opus-4-8';
const MAX_TEXT_LEN = 250_000;
const MAX_PDF_BASE64_BYTES = 22 * 1024 * 1024;

type ExtractBody = {
  text?: string;
  pdf?: string;
  filename?: string;
  lpa_text?: string;
  lpa_pdf?: string;
};

function asDoc(b64: string) {
  return {
    type: 'document' as const,
    source: {
      type: 'base64' as const,
      media_type: 'application/pdf' as const,
      data: b64,
    },
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not set on the server.' },
      { status: 500 }
    );
  }

  let body: ExtractBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const hasPdf = typeof body.pdf === 'string' && body.pdf.length > 0;
  const hasText = typeof body.text === 'string' && body.text.trim().length > 0;
  if (!hasPdf && !hasText) {
    return NextResponse.json(
      { error: 'Provide either `pdf` (base64) or `text`.' },
      { status: 400 }
    );
  }

  if (hasPdf && body.pdf!.length > MAX_PDF_BASE64_BYTES) {
    return NextResponse.json(
      {
        error: `PDF payload is ${Math.round(
          body.pdf!.length / 1024 / 1024
        )} MB (base64); cap is ${Math.round(MAX_PDF_BASE64_BYTES / 1024 / 1024)} MB.`,
      },
      { status: 413 }
    );
  }

  if (hasText && body.text!.length > MAX_TEXT_LEN) {
    return NextResponse.json(
      {
        error: `Document text is ${body.text!.length} characters; cap is ${MAX_TEXT_LEN}.`,
      },
      { status: 413 }
    );
  }

  const hasLpaPdf = typeof body.lpa_pdf === 'string' && body.lpa_pdf.length > 0;
  const hasLpaText = typeof body.lpa_text === 'string' && body.lpa_text.trim().length > 0;
  const lpaProvided = hasLpaPdf || hasLpaText;

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  type ContentBlock =
    | { type: 'text'; text: string }
    | ReturnType<typeof asDoc>;

  const userContent: ContentBlock[] = [];

  if (hasPdf) {
    userContent.push(asDoc(body.pdf!));
  }
  if (hasLpaPdf) {
    userContent.push({
      type: 'text',
      text: 'The following document is the Limited Partnership Agreement (LPA) for cross-reference:',
    });
    userContent.push(asDoc(body.lpa_pdf!));
  }
  if (hasPdf) {
    userContent.push({ type: 'text', text: USER_PROMPT_PDF_INTRO(lpaProvided) });
  } else {
    userContent.push({
      type: 'text',
      text: USER_PROMPT_TEXT(body.text!, hasLpaText ? body.lpa_text! : undefined),
    });
  }

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 16_384,
      system: SYSTEM_PROMPT,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: EXTRACTION_TOOL.name },
      messages: [{ role: 'user', content: userContent }],
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
        raw: toolUse.input,
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

import { NextResponse } from 'next/server';

import { submissionSchema } from '@/lib/schema/answer';

const PERSIST_DELAY_MS = 600;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Accepts a completed conversation. Validates the payload against the
 * submission schema and acknowledges it. This stands in for the upstream
 * service the original project posted to, keeping the app self-contained.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed JSON body.' }, { status: 400 });
  }

  const result = submissionSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid submission.' }, { status: 422 });
  }

  // A real implementation would persist the conversation here; the delay
  // stands in for that so the client's loading state is visible rather than
  // an instant flash, on a live deploy and not just when self-hosted nearby.
  await delay(PERSIST_DELAY_MS);

  return NextResponse.json({ status: 'ok', received: result.data.length }, { status: 200 });
}

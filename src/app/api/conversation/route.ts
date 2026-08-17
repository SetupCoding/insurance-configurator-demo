import { NextResponse } from 'next/server';

import { submissionSchema } from '@/lib/schema/answer';

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

  // A real implementation would persist the conversation here.
  return NextResponse.json({ status: 'ok', received: result.data.length }, { status: 200 });
}

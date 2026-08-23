import { NextResponse } from 'next/server';

import { getFlow } from '@/lib/data/flow';
import { validateSubmission } from '@/lib/domain/validateSubmission';
import { submissionSchema } from '@/lib/schema/answer';
import type { ErrorCode } from '@/lib/schema/conversation';

/**
 * The longest valid path is a few hundred bytes. Anything far past that is not
 * a conversation, so it is rejected before being parsed.
 */
const MAX_BODY_BYTES = 16 * 1024;

function fail(error: ErrorCode, status: number, detail?: string) {
  return NextResponse.json({ error, ...(detail ? { detail } : {}) }, { status });
}

/**
 * Accepts a completed conversation, checks it against the flow, and answers
 * with the choices resolved back to the wording they were offered under.
 *
 * This is a demo endpoint by design: it stores nothing and has no side effects,
 * so it is idempotent and needs neither an idempotency key nor deduplication.
 * What it does do is real: the reply is derived from the submitted path, so an
 * invented or tampered payload cannot produce one.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return fail('payload_too_large', 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('malformed_json', 400);
  }

  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return fail('invalid_submission', 422);
  }

  const result = validateSubmission(getFlow(), parsed.data);
  if (!result.ok) {
    return fail('invalid_path', 422, result.detail);
  }

  return NextResponse.json({ status: 'accepted', configuration: result.configuration });
}

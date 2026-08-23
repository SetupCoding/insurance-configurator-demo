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
 * Stores nothing, on purpose, which is what makes the operation idempotent and
 * an idempotency key unnecessary (ADR 0009). The check is real all the same:
 * the reply is derived from the submitted path, so a tampered payload cannot
 * produce one.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  // Encoded length, not string length: `raw.length` counts UTF-16 code units, so
  // a body of multi-byte characters would slip past a byte limit measured on it.
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

import { NextResponse } from 'next/server';

import { getFlow } from '@/lib/data/flow';

/** Public endpoint exposing the validated conversation flow. */
export function GET() {
  return NextResponse.json(getFlow());
}

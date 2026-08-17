import { type Flow, flowSchema } from '@/lib/schema/flow';

import rawFlow from './flow.json';

/**
 * The conversation flow is bundled with the app and validated once, at module
 * load. A malformed fixture is a programmer/build error rather than a runtime
 * condition, so failing fast here keeps invalid data from ever reaching the UI.
 *
 * Keeping the flow local (instead of fetching it from a third-party URL at
 * request time, as the original did) means the app builds and runs offline and
 * has no external point of failure.
 */
const flow: Flow = flowSchema.parse(rawFlow);

/** Returns the validated conversation flow. */
export function getFlow(): Flow {
  return flow;
}

import { type FlowDefinition, flowDefinitionSchema } from '@/lib/schema/flow';

import rawFlow from './flow.json';

/**
 * Validated once, at module load. A malformed fixture is a build error rather
 * than a runtime condition, so failing here keeps invalid data from ever
 * reaching the UI, and the whole app fails to start rather than half working.
 * A missing translation is one of the things that fails here, because every
 * display text is a locale-keyed record the schema requires to be complete.
 *
 * Keeping the flow local, instead of fetching it from a third-party URL at
 * request time as the original did, means the app builds and runs offline and
 * has no external point of failure.
 */
const flow: FlowDefinition = flowDefinitionSchema.parse(rawFlow);

export function getFlow(): FlowDefinition {
  return flow;
}

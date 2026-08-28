import type { Locale } from '@/lib/i18n/locales';
import type { Flow, FlowDefinition } from '@/lib/schema/flow';

/**
 * Resolves every display text in the flow to one locale.
 *
 * This runs on the server, once per render, and it is the boundary the locale
 * stops at. Below it the flow is a graph of plain strings, so the reducer, the
 * components and the persisted selections have no idea a second language
 * exists, and the payload serialised into the page carries one translation
 * rather than all of them.
 *
 * The graph is untouched: ids, names, values and `nextId` are copied through as
 * they are. Only `text` changes, which is why this cannot invalidate anything
 * `flowDefinitionSchema` proved about the structure.
 */
export function localizeFlow(flow: FlowDefinition, locale: Locale): Flow {
  return flow.map((step) => ({
    ...step,
    text: step.text[locale],
    valueOptions: step.valueOptions.map((option) => ({
      ...option,
      text: option.text[locale],
    })),
  }));
}

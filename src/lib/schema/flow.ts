import { z } from 'zod';

/**
 * Schemas describing the conversation flow. These are the single source of
 * truth for the domain: the TypeScript types below are inferred from them, so
 * the runtime validation and the compile-time types can never drift apart.
 *
 * The shape mirrors the upstream flow definition (a decision tree of steps,
 * each offering a set of options that point to the next step by id).
 */

export const valueTypeSchema = z.enum(['boolean', 'number', 'string']);

/** The value carried by a chosen option. */
export const optionValueSchema = z.union([z.boolean(), z.number(), z.string()]);

/** The id of the next step, or `false` to signal the end of the flow. */
export const nextIdSchema = z.union([z.number().int(), z.literal(false)]);

export const valueOptionSchema = z.object({
  nextId: nextIdSchema,
  value: optionValueSchema,
  text: z.string(),
});

export const stepSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  text: z.string().min(1),
  uiType: z.string(),
  valueType: valueTypeSchema,
  valueOptions: z.array(valueOptionSchema).min(1),
});

export const flowSchema = z.array(stepSchema).min(1);

export type ValueType = z.infer<typeof valueTypeSchema>;
export type OptionValue = z.infer<typeof optionValueSchema>;
export type NextId = z.infer<typeof nextIdSchema>;
export type ValueOption = z.infer<typeof valueOptionSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Flow = z.infer<typeof flowSchema>;

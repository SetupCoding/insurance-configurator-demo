'use client';

import { Box } from '@mui/material';

import type { AnsweredStep } from '@/features/flow/types';
import type { OptionValue } from '@/lib/schema/flow';

import { StepQuestion } from './StepQuestion';

type Props = {
  steps: AnsweredStep[];
  /** Whether every option should be disabled, e.g. while submitting. */
  disabled: boolean;
  onSelect: (stepId: number, value: OptionValue) => void;
};

/** Renders the ordered list of questions that make up the conversation. */
export const Conversation = ({ steps, disabled, onSelect }: Props) => {
  return (
    <Box sx={{ width: '100%' }}>
      {steps.map(({ step, selectedValue }, index) => (
        <StepQuestion
          key={step.id}
          step={step}
          selectedValue={selectedValue}
          disabled={disabled}
          onSelect={(value) => onSelect(step.id, value)}
          autoFocus={index > 0}
        />
      ))}
    </Box>
  );
};

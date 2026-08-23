'use client';

import { Box } from '@mui/material';

import type { AnsweredStep } from '@/features/flow/types';
import type { OptionValue } from '@/lib/schema/flow';

import { StepQuestion } from './StepQuestion';

type Props = {
  steps: AnsweredStep[];
  disabled: boolean;
  onSelect: (stepId: number, value: OptionValue) => void;
};

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
          // Every question but the first appeared in response to an answer, so
          // moving focus to it continues the user's action. Doing it to the
          // first one would move focus on page load, unprompted.
          autoFocus={index > 0}
        />
      ))}
    </Box>
  );
};

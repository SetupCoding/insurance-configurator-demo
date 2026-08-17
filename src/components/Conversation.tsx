'use client';

import { Box } from '@mui/material';

import type { AnsweredStep } from '@/features/flow/types';
import type { OptionValue } from '@/lib/schema/flow';

import { StepQuestion } from './StepQuestion';

type Props = {
  steps: AnsweredStep[];
  isFinished: boolean;
  onSelect: (stepId: number, value: OptionValue) => void;
};

/** Renders the ordered list of questions that make up the conversation. */
export function Conversation({ steps, isFinished, onSelect }: Props) {
  return (
    <Box sx={{ width: '100%' }}>
      {steps.map(({ step, selectedValue }) => (
        <StepQuestion
          key={step.id}
          step={step}
          selectedValue={selectedValue}
          disabled={isFinished}
          onSelect={(value) => onSelect(step.id, value)}
        />
      ))}
    </Box>
  );
}

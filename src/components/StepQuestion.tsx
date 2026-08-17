'use client';

import {
  Box,
  styled,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';

import type { OptionValue, Step } from '@/lib/schema/flow';

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: theme.spacing(1.5),
  '& .MuiToggleButtonGroup-grouped': {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    paddingInline: theme.spacing(3),
    '&.Mui-disabled': {
      border: `1px solid ${theme.palette.divider}`,
    },
  },
}));

type Props = {
  step: Step;
  selectedValue: OptionValue | null;
  disabled: boolean;
  onSelect: (value: OptionValue) => void;
};

/** Renders a single question with its selectable options. */
export function StepQuestion({ step, selectedValue, disabled, onSelect }: Props) {
  const isWide = useMediaQuery('(min-width:600px)');

  return (
    <Box sx={{ my: 3 }}>
      <Typography variant="h3" gutterBottom>
        {step.text}
      </Typography>
      <StyledToggleButtonGroup
        value={selectedValue}
        exclusive
        aria-label={step.text}
        size="large"
        orientation={isWide ? 'horizontal' : 'vertical'}
      >
        {step.valueOptions.map((option) => (
          <ToggleButton
            key={option.text}
            value={option.value}
            aria-label={option.text}
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            sx={{ minWidth: 72 }}
          >
            {option.text}
          </ToggleButton>
        ))}
      </StyledToggleButtonGroup>
    </Box>
  );
}

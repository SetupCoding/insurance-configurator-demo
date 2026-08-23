'use client';

import { Box, styled, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { ComponentRef } from 'react';
import { useEffect, useRef } from 'react';

import type { OptionValue, Step } from '@/lib/schema/flow';

const StyledToggleButtonGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: theme.spacing(1.5),
  '& .MuiToggleButtonGroup-grouped': {
    // The theme's default divider is intentionally faint; these are the main
    // interactive controls on the page and need a clearly visible outline.
    border: `1px solid ${theme.alpha(theme.palette.text.primary, 0.28)}`,
    borderRadius: theme.shape.borderRadius,
    paddingInline: theme.spacing(3),
    '&.Mui-disabled': {
      border: `1px solid ${theme.palette.divider}`,
    },
    // Forced-colors mode (Windows high contrast) strips the background tint
    // that normally shows a selected option. Focus itself is covered by the
    // theme-wide MuiButtonBase focus ring; this only needs to cover selection.
    '@media (forced-colors: active)': {
      '&.Mui-selected': {
        outline: '2px solid Highlight',
        outlineOffset: 2,
      },
    },
  },
}));

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

type Props = {
  step: Step;
  selectedValue: OptionValue | null;
  disabled: boolean;
  onSelect: (value: OptionValue) => void;
  /** Moves focus to this question when it appears. */
  autoFocus?: boolean;
};

export const StepQuestion = ({
  step,
  selectedValue,
  disabled,
  onSelect,
  autoFocus = false,
}: Props) => {
  const firstOptionRef = useRef<ComponentRef<typeof ToggleButton>>(null);

  useEffect(() => {
    if (!autoFocus) return;
    // The first option rather than the heading, so a keyboard user lands on
    // something actionable instead of having to tab past a heading first.
    firstOptionRef.current?.focus();
    firstOptionRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [autoFocus]);

  return (
    <Box sx={{ my: 3 }}>
      {/* German compound words (e.g. "Haftpflichtversicherung") have no
          natural break point and can overflow a narrow viewport otherwise. */}
      <Typography variant="h3" gutterBottom sx={{ overflowWrap: 'break-word' }}>
        {step.text}
      </Typography>
      <StyledToggleButtonGroup
        value={selectedValue}
        exclusive
        aria-label={step.text}
        size="large"
        orientation={'horizontal'}
      >
        {step.valueOptions.map((option, index) => (
          <ToggleButton
            key={option.text}
            ref={index === 0 ? firstOptionRef : undefined}
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
};

'use client';

import {
  Box,
  styled,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useEffect, useRef } from 'react';

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
  /** When true, focus moves to this question as it appears (skip the first). */
  autoFocus?: boolean;
};

/** Renders a single question with its selectable options. */
export function StepQuestion({
  step,
  selectedValue,
  disabled,
  onSelect,
  autoFocus = false,
}: Props) {
  const isWide = useMediaQuery('(min-width:600px)');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    // Move focus to the new question so screen-reader users hear it, and bring
    // it into view. Motion is suppressed when the user prefers reduced motion.
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [autoFocus]);

  return (
    <Box sx={{ my: 3 }}>
      <Typography ref={headingRef} tabIndex={-1} variant="h3" gutterBottom>
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

import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Step } from '@/lib/schema/flow';
import { renderWithTheme, screen } from '@/test/render';

import { StepQuestion } from './StepQuestion';

const step: Step = {
  id: 100,
  name: 'liability',
  text: 'Do you need liability insurance?',
  uiType: 'button',
  valueType: 'boolean',
  valueOptions: [
    { nextId: 200, value: true, text: 'Yes' },
    { nextId: 200, value: false, text: 'No' },
  ],
};

describe('StepQuestion', () => {
  it('renders the question and its options', () => {
    renderWithTheme(
      <StepQuestion step={step} selectedValue={null} disabled={false} onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: step.text })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('marks the selected option as pressed', () => {
    renderWithTheme(
      <StepQuestion step={step} selectedValue={false} disabled={false} onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'No' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSelect with the option value when clicked', async () => {
    const onSelect = vi.fn();
    renderWithTheme(
      <StepQuestion step={step} selectedValue={null} disabled={false} onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
    expect(onSelect).toHaveBeenCalledWith(true);
  });

  it('disables all options when disabled', () => {
    renderWithTheme(<StepQuestion step={step} selectedValue={null} disabled onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Yes' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'No' })).toBeDisabled();
  });

  it('moves focus to the first option when autoFocus is set', () => {
    renderWithTheme(
      <StepQuestion
        step={step}
        selectedValue={null}
        disabled={false}
        onSelect={vi.fn()}
        autoFocus
      />,
    );

    expect(screen.getByRole('button', { name: 'Yes' })).toHaveFocus();
  });
});

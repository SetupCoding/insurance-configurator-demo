import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { AnsweredStep } from '@/features/flow/types';
import { renderWithTheme, screen } from '@/test/render';

import { Conversation } from './Conversation';

const steps: AnsweredStep[] = [
  {
    step: {
      id: 100,
      name: 'liability',
      text: 'Question one?',
      uiType: 'button',
      valueType: 'boolean',
      valueOptions: [
        { nextId: 200, value: true, text: 'Yes' },
        { nextId: 200, value: false, text: 'No' },
      ],
    },
    selectedValue: true,
  },
  {
    step: {
      id: 200,
      name: 'casco',
      text: 'Question two?',
      uiType: 'button',
      valueType: 'string',
      valueOptions: [{ nextId: false, value: 'a', text: 'Option A' }],
    },
    selectedValue: null,
  },
];

describe('Conversation', () => {
  it('renders every visible step as a question', () => {
    renderWithTheme(<Conversation steps={steps} disabled={false} onSelect={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Question one?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Question two?' })).toBeInTheDocument();
  });

  it('reports the step id and value when an option is chosen', async () => {
    const onSelect = vi.fn();
    renderWithTheme(<Conversation steps={steps} disabled={false} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: 'Option A' }));
    expect(onSelect).toHaveBeenCalledWith(200, 'a');
  });

  it('moves focus to the first option of a newly revealed question (not the first)', () => {
    renderWithTheme(<Conversation steps={steps} disabled={false} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Option A' })).toHaveFocus();
  });

  it('disables all options when disabled', () => {
    renderWithTheme(<Conversation steps={steps} disabled onSelect={vi.fn()} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });
});

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
      text: 'Frage eins?',
      uiType: 'button',
      valueType: 'boolean',
      valueOptions: [
        { nextId: 200, value: true, text: 'Ja' },
        { nextId: 200, value: false, text: 'Nein' },
      ],
    },
    selectedValue: true,
  },
  {
    step: {
      id: 200,
      name: 'casco',
      text: 'Frage zwei?',
      uiType: 'button',
      valueType: 'string',
      valueOptions: [{ nextId: false, value: 'a', text: 'Option A' }],
    },
    selectedValue: null,
  },
];

describe('Conversation', () => {
  it('renders every visible step as a question', () => {
    renderWithTheme(<Conversation steps={steps} isFinished={false} onSelect={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Frage eins?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Frage zwei?' })).toBeInTheDocument();
  });

  it('reports the step id and value when an option is chosen', async () => {
    const onSelect = vi.fn();
    renderWithTheme(<Conversation steps={steps} isFinished={false} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: 'Option A' }));
    expect(onSelect).toHaveBeenCalledWith(200, 'a');
  });

  it('moves focus to a newly revealed question (not the first)', () => {
    renderWithTheme(<Conversation steps={steps} isFinished={false} onSelect={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Frage zwei?' })).toHaveFocus();
  });

  it('disables all options once the flow is finished', () => {
    renderWithTheme(<Conversation steps={steps} isFinished onSelect={vi.fn()} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });
});

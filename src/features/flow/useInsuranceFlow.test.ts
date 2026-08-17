import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { getFlow } from '@/lib/data/flow';

import { saveSelections } from './persistence';
import { useInsuranceFlow } from './useInsuranceFlow';

const flow = getFlow();

describe('useInsuranceFlow', () => {
  it('starts on the first step', () => {
    const { result } = renderHook(() => useInsuranceFlow(flow));
    expect(result.current.steps).toHaveLength(1);
    expect(result.current.isFinished).toBe(false);
  });

  it('advances and collects answers as options are selected', () => {
    const { result } = renderHook(() => useInsuranceFlow(flow));

    act(() => result.current.selectOption(100, false));
    act(() => result.current.selectOption(200, false));

    expect(result.current.steps.map((s) => s.step.id)).toEqual([100, 200, 300]);
    expect(result.current.answers).toEqual([
      { name: 'liability', value: false },
      { name: 'casco', value: false },
    ]);
  });

  it('persists selections so they survive a remount', () => {
    const first = renderHook(() => useInsuranceFlow(flow));
    act(() => first.result.current.selectOption(100, true));
    first.unmount();

    // A fresh mount should restore the previously answered steps.
    const second = renderHook(() => useInsuranceFlow(flow));
    expect(second.result.current.steps.map((s) => s.step.id)).toEqual([100, 200]);
    expect(second.result.current.steps[0].selectedValue).toBe(true);
  });

  it('restores a saved selection written before mount', () => {
    saveSelections([{ stepId: 100, value: false }]);

    const { result } = renderHook(() => useInsuranceFlow(flow));
    expect(result.current.steps.map((s) => s.step.id)).toEqual([100, 200]);
    expect(result.current.steps[0].selectedValue).toBe(false);
  });
});

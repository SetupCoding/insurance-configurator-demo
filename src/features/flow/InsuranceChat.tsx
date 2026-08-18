'use client';

import { Box, Container, Typography } from '@mui/material';
import { useEffect } from 'react';

import { Conversation, ErrorState, LoadingIndicator } from '@/components';
import type { Flow } from '@/lib/schema/flow';

import { useInsuranceFlow } from './useInsuranceFlow';
import { useSubmitAnswers } from './useSubmitAnswers';

type Props = {
  flow: Flow;
};

/**
 * Top-level client component for the conversation. Owns the flow state, submits
 * the answers once the flow completes, and surfaces loading, success and error
 * feedback (with a retry).
 */
export function InsuranceChat({ flow }: Props) {
  const { steps, isFinished, answers, selectOption } = useInsuranceFlow(flow);
  const submit = useSubmitAnswers();

  const { mutate } = submit;
  useEffect(() => {
    if (isFinished) {
      mutate(answers);
    }
    // Submit exactly once per completion; `answers` are final when finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished]);

  return (
    <Container
      maxWidth="md"
      component="main"
      id="main-content"
      sx={{ py: { xs: 4, md: 6 }, textAlign: 'center' }}
    >
      <Typography variant="h2" gutterBottom>
        Versicherungs-Helfer
      </Typography>

      <Conversation steps={steps} isFinished={isFinished} onSelect={selectOption} />

      <LoadingIndicator isLoading={submit.isPending} />

      {submit.isSuccess && (
        <Typography variant="h3" sx={{ mt: 4 }}>
          Herzlichen Dank für Ihre Angaben!
        </Typography>
      )}

      {submit.isError && (
        <Box sx={{ mt: 4 }}>
          <ErrorState message={submit.error.message} onRetry={() => mutate(answers)} />
        </Box>
      )}
    </Container>
  );
}

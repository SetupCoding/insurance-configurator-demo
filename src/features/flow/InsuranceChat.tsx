'use client';

import SendIcon from '@mui/icons-material/Send';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';

import { Conversation, ErrorState } from '@/components';
import type { Flow } from '@/lib/schema/flow';

import { ResetButton } from './ResetButton';
import { useInsuranceFlow } from './useInsuranceFlow';
import { useSubmitAnswers } from './useSubmitAnswers';

type Props = {
  flow: Flow;
};

/**
 * Top-level client component for the conversation. Owns the flow state and
 * submits the answers once the user confirms, surfacing loading, success and
 * error feedback (with a retry).
 */
export function InsuranceChat({ flow }: Props) {
  const { steps, isFinished, hasAnswers, answers, selectOption, reset } = useInsuranceFlow(flow);
  const submit = useSubmitAnswers();

  const { mutate } = submit;

  const handleReset = () => {
    submit.reset();
    reset();
  };

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

      {hasAnswers && <ResetButton onConfirm={handleReset} />}

      {/* Once every question is answered, submission still needs an explicit
          "Absenden" click, so earlier answers stay editable until then; only
          an in-flight request or a completed submission locks them. */}
      <Conversation
        steps={steps}
        disabled={submit.isPending || submit.isSuccess}
        onSelect={selectOption}
      />

      {isFinished && (submit.isIdle || submit.isPending) && (
        <Button
          variant="contained"
          startIcon={
            submit.isPending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />
          }
          onClick={() => {
            if (!submit.isPending) mutate(answers);
          }}
          aria-busy={submit.isPending}
          aria-disabled={submit.isPending}
          sx={{ mt: 3 }}
        >
          {submit.isPending ? 'Wird gesendet…' : 'Absenden'}
        </Button>
      )}

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

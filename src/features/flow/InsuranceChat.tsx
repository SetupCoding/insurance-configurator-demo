'use client';

import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SendIcon from '@mui/icons-material/Send';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';

import { Conversation, ErrorState } from '@/components';
import type { Flow } from '@/lib/schema/flow';

import { useInsuranceFlow } from './useInsuranceFlow';
import { useSubmitAnswers } from './useSubmitAnswers';

type Props = {
  flow: Flow;
};

// Fixed, so appearing once an answer exists never shifts the conversation
// below it (matching the theme toggle's corner in the top-right).
const resetSx = {
  position: 'fixed',
  top: 16,
  left: 16,
  zIndex: 'tooltip',
} as const;

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

      {hasAnswers && (
        <Button onClick={handleReset} startIcon={<RestartAltIcon />} size="small" sx={resetSx}>
          Neu starten
        </Button>
      )}

      <Conversation steps={steps} isFinished={isFinished} onSelect={selectOption} />

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

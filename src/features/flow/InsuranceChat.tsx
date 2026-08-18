'use client';

import SendIcon from '@mui/icons-material/Send';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';

import { Conversation, ErrorState, Header } from '@/components';
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
export const InsuranceChat = ({ flow }: Props) => {
  const { steps, isFinished, hasAnswers, answers, selectOption, reset } = useInsuranceFlow(flow);
  const submit = useSubmitAnswers();

  const { mutate } = submit;

  const handleReset = () => {
    submit.reset();
    reset();
  };

  // The header's reset button retires once the answers are actually
  // submitted; from that point the flow is over, and a fresh reset button
  // appears next to the thank-you message instead.
  const showHeaderReset = hasAnswers && !submit.isSuccess;

  return (
    <>
      <Header start={showHeaderReset && <ResetButton onConfirm={handleReset} />} />

      <Container
        maxWidth="md"
        component="main"
        id="main-content"
        sx={{ py: { xs: 4, md: 6 }, textAlign: 'center' }}
      >
        <Typography variant="h2" gutterBottom>
          Versicherungs-Helfer
        </Typography>

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
            // The default line-height is looser than the icon is tall, which
            // otherwise leaves the label sitting visibly above centre next to
            // it; the remaining ~1px gap is font/glyph-metric asymmetry
            // line-height alone can't close, measured and nudged away directly.
            sx={{
              mt: 3,
              lineHeight: 1,
              '& .MuiButton-startIcon': { position: 'relative', top: -1 },
            }}
          >
            {submit.isPending ? 'Wird gesendet…' : 'Absenden'}
          </Button>
        )}

        {submit.isSuccess && (
          <>
            <Typography variant="h3" sx={{ mt: 4 }}>
              Herzlichen Dank für Ihre Angaben!
            </Typography>
            <Box sx={{ mt: 2 }}>
              <ResetButton onConfirm={handleReset} />
            </Box>
          </>
        )}

        {submit.isError && (
          <Box sx={{ mt: 4 }}>
            <ErrorState message={submit.error.message} onRetry={() => mutate(answers)} />
          </Box>
        )}
      </Container>
    </>
  );
};

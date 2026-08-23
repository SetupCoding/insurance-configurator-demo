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
  const submission = useSubmitAnswers();

  const handleReset = () => {
    // Resetting during a submission aborts it, so a response already on the
    // wire cannot land in the conversation the user just restarted.
    submission.reset();
    reset();
  };

  // The header's reset button retires once the answers are actually
  // submitted; from that point the flow is over, and a fresh reset button
  // appears next to the thank-you message instead.
  const showHeaderReset = hasAnswers && !submission.isSuccess;

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
          disabled={submission.isPending || submission.isSuccess}
          onSelect={selectOption}
        />

        {isFinished && (submission.isIdle || submission.isPending) && (
          <Button
            variant="contained"
            startIcon={
              // Button forces its startIcon to 20px for a medium button via
              // font-size (which SendIcon follows); CircularProgress ignores
              // font-size and sizes itself from this prop directly, so it
              // has to be given the same 20px to keep the button's height
              // from shrinking while a submission is pending.
              submission.isPending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />
            }
            // aria-disabled rather than the native attribute on purpose: a
            // natively disabled button drops out of the tab order and stops
            // being announced, which is exactly the wrong thing while it is
            // the control reporting progress. Double submission is prevented
            // where it actually can be, by the synchronous guard in
            // useSubmitAnswers, not by hoping a click cannot get through.
            onClick={() => submission.submit(answers)}
            aria-busy={submission.isPending}
            aria-disabled={submission.isPending}
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
            {submission.isPending ? 'Wird gesendet…' : 'Absenden'}
          </Button>
        )}

        {submission.isSuccess && (
          <>
            <Typography variant="h3" sx={{ mt: 4 }}>
              Herzlichen Dank für Ihre Angaben!
            </Typography>
            <Box sx={{ mt: 2 }}>
              <ResetButton onConfirm={handleReset} />
            </Box>
          </>
        )}

        {submission.isError && (
          <Box sx={{ mt: 4 }}>
            <ErrorState
              message={submission.error?.message}
              onRetry={() => submission.submit(answers)}
            />
          </Box>
        )}
      </Container>
    </>
  );
};

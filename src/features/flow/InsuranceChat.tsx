'use client';

import SendIcon from '@mui/icons-material/Send';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';

import { ConfigurationSummary, Conversation, ErrorState, Header } from '@/components';
import type { Flow } from '@/lib/schema/flow';

import { ResetButton } from './ResetButton';
import { useInsuranceFlow } from './useInsuranceFlow';
import { useSubmitAnswers } from './useSubmitAnswers';

type Props = {
  flow: Flow;
};

/**
 * The only `use client` boundary in the page. Everything interactive hangs off
 * this one component, so the rest of the tree stays a Server Component.
 */
export const InsuranceChat = ({ flow }: Props) => {
  const submission = useSubmitAnswers();
  // Once the answers are accepted the conversation is over, so the stored copy
  // goes away while the result stays on screen until reset or reload.
  const { steps, isFinished, hasAnswers, answers, selectOption, reset } = useInsuranceFlow(flow, {
    persist: !submission.isSuccess,
  });

  const handleReset = () => {
    // Resetting during a submission aborts it, so a response already on the
    // wire cannot land in the conversation the user just restarted.
    submission.reset();
    reset();
  };

  // The header's reset button retires once the answers are actually
  // submitted; from that point the flow is over, and a fresh reset button
  // appears next to the result instead.
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
          Versicherungs-Konfigurator
        </Typography>
        {/* What this is has to be legible to someone who only ever opens the
            deployed page, not just to someone who reads the README. */}
        <Typography sx={{ color: 'text.secondary', maxWidth: '52ch', mx: 'auto' }}>
          Technische Demo, keine Versicherungsberatung. Ihre Auswahl wird zur Prüfung an den Server
          geschickt, dort nicht gespeichert und nicht weiterverarbeitet.
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
            // aria-disabled, not the native attribute: a disabled button leaves
            // the tab order and stops being announced, which is the wrong thing
            // to do to the control that is reporting progress. The double submit
            // is stopped by the synchronous guard in useSubmitAnswers, where it
            // actually can be. See ADR 0010.
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

        {submission.configuration && (
          <Box sx={{ mt: 4 }}>
            <ConfigurationSummary configuration={submission.configuration} />
            <Box sx={{ mt: 3 }}>
              <ResetButton onConfirm={handleReset} />
            </Box>
          </Box>
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

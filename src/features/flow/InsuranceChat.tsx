'use client';

import SendIcon from '@mui/icons-material/Send';
import { Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

import { ConfigurationSummary, Conversation, ErrorState, Header } from '@/components';
import type { Locale } from '@/lib/i18n/locales';
import type { Flow } from '@/lib/schema/flow';
import { ICON_LABEL_ALIGNMENT } from '@/theme/buttonStyles';

import { ResetButton } from './ResetButton';
import { useInsuranceFlow } from './useInsuranceFlow';
import { useSubmitAnswers } from './useSubmitAnswers';

type Props = {
  /** Already resolved to `locale` by the server; see `localizeFlow`. */
  flow: Flow;
  /**
   * Needed for the submission, not for the rendering. The server resolves the
   * wording of its reply in this locale, so it belongs to the request.
   */
  locale: Locale;
};

/**
 * The only `use client` boundary in the page. Everything interactive hangs off
 * this one component, so the rest of the tree stays a Server Component.
 */
export const InsuranceChat = ({ flow, locale }: Props) => {
  const t = useTranslations('chat');
  const submission = useSubmitAnswers(locale);
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
          {t('title')}
        </Typography>
        {/* What this is has to be legible to someone who only ever opens the
            deployed page, not just to someone who reads the README. */}
        <Typography sx={{ color: 'text.secondary', maxWidth: '52ch', mx: 'auto' }}>
          {t('subtitle')}
        </Typography>

        {/* Once every question is answered, submission still needs an explicit
            click, so earlier answers stay editable until then; only an
            in-flight request or a completed submission locks them. */}
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
            sx={{ mt: 3, ...ICON_LABEL_ALIGNMENT }}
          >
            {submission.isPending ? t('submitting') : t('submit')}
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
            <ErrorState failure={submission.failure} onRetry={() => submission.submit(answers)} />
          </Box>
        )}
      </Container>
    </>
  );
};

'use client';

import SendIcon from '@mui/icons-material/Send';
import { Box, Button, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';

import type { SubmissionFailure } from '@/lib/api/submitConversation';
import { ICON_LABEL_ALIGNMENT } from '@/theme/buttonStyles';

type Props = {
  /** When absent, nothing renders. */
  failure?: SubmissionFailure;
  /** When provided, a retry button is shown instead of the "try later" hint. */
  onRetry?: () => void;
};

/**
 * Takes the failure code rather than a sentence, and translates it here.
 *
 * That is also the fix for something this component used to get wrong: it
 * received a message, used it only to decide whether to render at all, and then
 * showed the generic heading instead. Every per-code sentence the API layer
 * built was thrown away, so a rejected path and an unreachable server read
 * identically. The reason is now shown.
 */
export const ErrorState = ({ failure, onRetry }: Props) => {
  const t = useTranslations('error');

  if (!failure) return null;

  return (
    <Box
      role="alert"
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
    >
      <Typography variant="h3" color="error">
        {t('heading')}
      </Typography>
      <Typography>{t(failure)}</Typography>
      {onRetry ? (
        <Button
          variant="contained"
          color="error"
          startIcon={<SendIcon />}
          onClick={onRetry}
          sx={ICON_LABEL_ALIGNMENT}
        >
          {t('retry')}
        </Button>
      ) : (
        <Typography sx={{ color: 'text.secondary' }}>{t('hint')}</Typography>
      )}
    </Box>
  );
};

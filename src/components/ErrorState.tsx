import SendIcon from '@mui/icons-material/Send';
import { Box, Button, Typography } from '@mui/material';

import { ICON_LABEL_ALIGNMENT } from '@/theme/buttonStyles';

type Props = {
  /** When absent, nothing renders. */
  message?: string;
  /** When provided, a retry button is shown instead of the "try later" hint. */
  onRetry?: () => void;
};

export const ErrorState = ({ message, onRetry }: Props) => {
  if (!message) return null;

  return (
    <Box
      role="alert"
      sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
    >
      <Typography variant="h3" color="error">
        Ein Fehler ist aufgetreten.
        {onRetry ? '' : ' Bitte versuchen Sie es in ein paar Minuten erneut.'}
      </Typography>
      {onRetry && (
        <Button
          variant="contained"
          color="error"
          startIcon={<SendIcon />}
          onClick={onRetry}
          sx={ICON_LABEL_ALIGNMENT}
        >
          Erneut absenden
        </Button>
      )}
    </Box>
  );
};

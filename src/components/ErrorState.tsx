import { Box, Button, Typography } from '@mui/material';

type Props = {
  /** When absent, nothing renders. */
  message?: string;
  /** When provided, a retry button is shown instead of the "try later" hint. */
  onRetry?: () => void;
};

/** Announces an error and, optionally, offers a retry. */
export function ErrorState({ message, onRetry }: Props) {
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
        <Button variant="contained" color="error" onClick={onRetry}>
          Erneut absenden
        </Button>
      )}
    </Box>
  );
}

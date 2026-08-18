import SendIcon from '@mui/icons-material/Send';
import { Box, Button, Typography } from '@mui/material';

type Props = {
  /** When absent, nothing renders. */
  message?: string;
  /** When provided, a retry button is shown instead of the "try later" hint. */
  onRetry?: () => void;
};

/** Announces an error and, optionally, offers a retry. */
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
          // The default line-height is looser than the icon is tall, which
          // otherwise leaves the label sitting visibly above centre next to it;
          // the remaining ~1px gap is font/glyph-metric asymmetry line-height
          // alone can't close, measured and nudged away directly.
          sx={{ lineHeight: 1, '& .MuiButton-startIcon': { position: 'relative', top: -1 } }}
        >
          Erneut absenden
        </Button>
      )}
    </Box>
  );
};

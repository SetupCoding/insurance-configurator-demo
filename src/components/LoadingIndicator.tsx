import { Box, LinearProgress, Typography } from '@mui/material';

type Props = {
  isLoading: boolean;
};

/** A polite, screen-reader-announced progress indicator for submission. */
export function LoadingIndicator({ isLoading }: Props) {
  if (!isLoading) return null;

  return (
    <Box role="status" aria-live="polite" sx={{ width: 'fit-content', mx: 'auto', my: 2 }}>
      <Typography variant="h3">Sende Daten&hellip;</Typography>
      <LinearProgress />
    </Box>
  );
}

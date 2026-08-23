import { Box, Typography } from '@mui/material';
import { Fragment } from 'react';

import type { Configuration } from '@/lib/schema/conversation';

type Props = {
  configuration: Configuration;
};

/**
 * Shows the path as the server read it back, not as the client remembers it.
 *
 * A description list rather than two columns of text, so the pairing between a
 * question and its answer is available to a screen reader and not only to the
 * eye; the grid is layout over that structure, not a replacement for it.
 */
export const ConfigurationSummary = ({ configuration }: Props) => {
  return (
    <Box>
      <Typography variant="h3" gutterBottom>
        Ihre Demo-Konfiguration
      </Typography>
      <Typography sx={{ mb: 3, color: 'text.secondary' }}>
        Gegen den Gesprächsverlauf geprüft und danach verworfen. Es wurde nichts gespeichert und
        nichts weiterverarbeitet.
      </Typography>
      <Box
        component="dl"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'auto auto' },
          justifyContent: 'center',
          columnGap: 3,
          rowGap: 1.5,
          textAlign: 'left',
          m: 0,
        }}
      >
        {configuration.map((entry) => (
          <Fragment key={entry.name}>
            {/* Long German compounds have no natural break point. */}
            <Typography component="dt" sx={{ color: 'text.secondary', overflowWrap: 'break-word' }}>
              {entry.question}
            </Typography>
            <Typography component="dd" sx={{ m: 0, fontWeight: 500 }}>
              {entry.label}
            </Typography>
          </Fragment>
        ))}
      </Box>
    </Box>
  );
};

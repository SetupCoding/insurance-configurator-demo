import { Box, Typography } from '@mui/material';
import { Fragment } from 'react';

import type { Configuration } from '@/lib/schema/conversation';

type Props = {
  configuration: Configuration;
};

/**
 * The outcome of a submission: the answered path as the server read it back,
 * not as the client remembers it. A description list keeps each question tied
 * to its answer for assistive technology rather than only visually, which is
 * why the two columns are a grid over `dt`/`dd` instead of a table.
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
            {/* German compound words have no natural break point and would
                otherwise overflow a narrow viewport. */}
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

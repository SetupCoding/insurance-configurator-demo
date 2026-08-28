'use client';

import { Box, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

import type { Configuration } from '@/lib/schema/conversation';

type Props = {
  configuration: Configuration;
};

/**
 * Shows the path as the server read it back, not as the client remembers it.
 * The question and answer wording here comes from the response, which is why it
 * is not translated locally: it is evidence that the server walked the flow.
 *
 * A description list rather than two columns of text, so the pairing between a
 * question and its answer is available to a screen reader and not only to the
 * eye; the grid is layout over that structure, not a replacement for it.
 */
export const ConfigurationSummary = ({ configuration }: Props) => {
  const t = useTranslations('summary');

  return (
    <Box>
      <Typography variant="h3" gutterBottom>
        {t('heading')}
      </Typography>
      <Typography sx={{ mb: 3, color: 'text.secondary' }}>{t('note')}</Typography>
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

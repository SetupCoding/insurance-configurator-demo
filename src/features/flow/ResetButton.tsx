'use client';

import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, Button, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { type Ref, useRef } from 'react';

// Deliberately not ICON_LABEL_ALIGNMENT: this is a small text button, whose
// smaller icon does not need the one-pixel nudge that the medium contained
// buttons do. Only the loose line-height has to be corrected.
const buttonSx = { lineHeight: 1 } as const;

type Props = {
  onConfirm: () => void;
  /** Attached to the button itself, so a caller can move focus to it. */
  ref?: Ref<HTMLButtonElement>;
};

/**
 * Confirmed before it discards anything, because a stray click would otherwise
 * throw away the whole conversation.
 *
 * The native <dialog> via showModal() rather than a hand-rolled modal: focus
 * trapping, Escape-to-close and the modal semantics come for free. Leaving
 * autoFocus unset is deliberate too, since showModal() then focuses the first
 * button, so a stray Enter cancels rather than confirming.
 */
export const ResetButton = ({ onConfirm, ref }: Props) => {
  const t = useTranslations('reset');
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = () => dialogRef.current?.close();
  const confirm = () => {
    close();
    onConfirm();
  };

  return (
    <>
      <Button
        ref={ref}
        onClick={() => dialogRef.current?.showModal()}
        startIcon={<RestartAltIcon />}
        size="small"
        sx={buttonSx}
      >
        {t('action')}
      </Button>
      <Box
        component="dialog"
        ref={dialogRef}
        aria-labelledby="reset-dialog-title"
        onClick={(event) => {
          // A click that lands on the dialog element itself (rather than
          // bubbling up from its content) hit the backdrop.
          if (event.target === dialogRef.current) close();
        }}
        sx={{
          p: 0,
          border: 0,
          borderRadius: 2,
          bgcolor: 'background.paper',
          color: 'text.primary',
          maxWidth: 360,
          '&::backdrop': {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography id="reset-dialog-title" variant="h3" gutterBottom>
            {t('confirmTitle')}
          </Typography>
          <Typography sx={{ mb: 3 }}>{t('confirmBody')}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={close}>{t('cancel')}</Button>
            <Button variant="contained" onClick={confirm}>
              {t('confirm')}
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

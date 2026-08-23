'use client';

import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, Button, Typography } from '@mui/material';
import { useRef } from 'react';

const buttonSx = {
  // The button's default line-height is looser than the icon is tall, which
  // otherwise leaves the (all-caps, no descenders) label sitting visibly
  // above centre next to it.
  lineHeight: 1,
} as const;

type Props = {
  onConfirm: () => void;
};

/**
 * Confirmed before it discards anything, because a stray click would otherwise
 * throw away the whole conversation.
 *
 * The native <dialog> via showModal() rather than a hand-rolled modal: focus
 * trapping, Escape-to-close and the modal semantics come for free. Leaving
 * autoFocus unset is deliberate too, since showModal() then focuses the first
 * button, so a stray Enter hits "Abbrechen" rather than confirming.
 */
export const ResetButton = ({ onConfirm }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = () => dialogRef.current?.close();
  const confirm = () => {
    close();
    onConfirm();
  };

  return (
    <>
      <Button
        onClick={() => dialogRef.current?.showModal()}
        startIcon={<RestartAltIcon />}
        size="small"
        sx={buttonSx}
      >
        Neu starten
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
            Neu starten?
          </Typography>
          <Typography sx={{ mb: 3 }}>Ihre bisherigen Angaben gehen dabei verloren.</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={close}>Abbrechen</Button>
            <Button variant="contained" onClick={confirm}>
              Neu starten
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

'use client';

import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, Button, Typography } from '@mui/material';
import { useRef } from 'react';

// Fixed, so appearing once an answer exists never shifts the conversation
// below it (matching the theme toggle's corner in the top-right).
const buttonSx = {
  position: 'fixed',
  top: 16,
  left: 16,
  zIndex: 'tooltip',
} as const;

type Props = {
  onConfirm: () => void;
};

/**
 * "Neu starten", guarded by a confirmation prompt so a stray click doesn't
 * discard progress. Uses the native <dialog> element via showModal() for
 * built-in focus trapping, Escape-to-close and accessible modal semantics,
 * rather than hand-rolling them. With no autoFocus set, showModal() focuses
 * the first button ("Abbrechen") by default, so a stray Enter cancels
 * instead of confirming the destructive action.
 */
export function ResetButton({ onConfirm }: Props) {
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
}

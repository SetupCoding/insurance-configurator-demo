'use client';

import { Container, Typography } from '@mui/material';

import { Conversation } from '@/components';
import type { Flow } from '@/lib/schema/flow';

import { useInsuranceFlow } from './useInsuranceFlow';

type Props = {
  flow: Flow;
};

/**
 * Top-level client component for the conversation. Owns the flow state and
 * renders the questions; submission feedback is added on top of this.
 */
export function InsuranceChat({ flow }: Props) {
  const { steps, isFinished, selectOption } = useInsuranceFlow(flow);

  return (
    <Container maxWidth="md" component="main" sx={{ py: { xs: 4, md: 6 }, textAlign: 'center' }}>
      <Typography variant="h2" gutterBottom>
        Versicherungs-Helfer
      </Typography>
      <Conversation steps={steps} isFinished={isFinished} onSelect={selectOption} />
    </Container>
  );
}

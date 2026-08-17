import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/** MSW server used to intercept network calls in tests. */
export const server = setupServer(...handlers);

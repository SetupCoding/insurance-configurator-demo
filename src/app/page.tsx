import { InsuranceChat } from '@/features/flow/InsuranceChat';
import { getFlow } from '@/lib/data/flow';

/**
 * Server Component: loads the validated flow at render time and hands it to
 * the client conversation. The flow is prerendered into the page, so there is
 * no request-time data fetch.
 */
const HomePage = () => {
  const flow = getFlow();
  return <InsuranceChat flow={flow} />;
};

export default HomePage;

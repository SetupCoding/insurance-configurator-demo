import { InsuranceChat } from '@/features/flow/InsuranceChat';
import { getFlow } from '@/lib/data/flow';

/**
 * The flow is read on the server and prerendered into the page, so the client
 * never fetches it and the first paint already has the opening question.
 */
const HomePage = () => {
  const flow = getFlow();
  return <InsuranceChat flow={flow} />;
};

export default HomePage;

import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { InsuranceChat } from '@/features/flow/InsuranceChat';
import { getFlow } from '@/lib/data/flow';
import { localizeFlow } from '@/lib/domain/localizeFlow';
import { isLocale } from '@/lib/i18n/locales';

/**
 * The flow is read and resolved to this request's locale on the server, then
 * prerendered into the page, so the client never fetches it, the first paint
 * already has the opening question, and the payload carries one language rather
 * than all of them.
 */
const HomePage = async ({ params }: PageProps<'/[locale]'>) => {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const flow = localizeFlow(getFlow(), locale);
  return <InsuranceChat flow={flow} locale={locale} />;
};

export default HomePage;

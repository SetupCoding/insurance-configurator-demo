import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n/locales';

/**
 * How next-intl gets the messages for a request.
 *
 * `requestLocale` is whatever `setRequestLocale` was called with, which the
 * locale layout does from its own route parameter. The fallback is not the
 * mechanism for an unknown locale: the layout answers that with `notFound()`,
 * and the proxy redirects anything that is not a locale before it gets
 * this far. It is here so that a request which somehow arrives without a locale
 * renders the default rather than throwing.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

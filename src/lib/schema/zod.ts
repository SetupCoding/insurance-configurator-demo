import { z } from 'zod';

/**
 * Zod, configured once, and the only place the rest of the app imports it from.
 * Importing `zod` directly would skip this and reintroduce the problem below.
 *
 * `jitless` turns off Zod's compiled fast path. To decide whether it can use
 * that path, Zod calls `new Function('')` inside a try/catch and falls back
 * when it throws, which is exactly what happens under this app's
 * Content-Security-Policy: `script-src` names a nonce and never
 * `'unsafe-eval'`. Nothing breaks, because the fallback is the point of the
 * try/catch, but the browser still reports the blocked attempt as a
 * `securitypolicyviolation`, and a policy that fires violations during ordinary
 * use is one people learn to ignore. Zod documents this flag for the purpose
 * and skips the probe entirely when it is set.
 *
 * The interpreted path costs nothing measurable here. The largest thing this
 * app validates is a six-element array, once per submission, and on the server
 * the flow fixture once at boot.
 */
z.config({ jitless: true });

export { z };

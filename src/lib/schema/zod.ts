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
 *
 * Zod 4.5 added `z.compile()`, which generates the same fast path on demand
 * and, unlike the global `import 'zod/compile'` opt-in, does not consult
 * `jitless`. Measured against 4.5.4: two `new Function` calls per schema
 * compiled, which is two violation reports in the browser and no speedup,
 * because the generated function is rejected and Zod falls back here anyway.
 * So the rule is the flag plus one more: do not call `z.compile()`. Nothing
 * here would gain from it in any case, the flow fixture being the only schema
 * big enough to care and parsed exactly once.
 */
z.config({ jitless: true });

export { z };

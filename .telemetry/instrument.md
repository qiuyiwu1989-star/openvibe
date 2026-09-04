# Tongxue usage instrumentation

OpenVibe uses the Tongxue first-party collection script assigned to external work `215`.

- Framework: Next.js App Router with TypeScript.
- Scope: browser only, once in the root layout.
- Script: `https://tongxue.yongle.school/z.js`.
- Work slug: `app-96d5b4`.
- Collection endpoint: `https://tongxue.yongle.school/api/collect`.
- Delivery: the vendor script automatically records page use and engagement heartbeats. OpenVibe does not send arbitrary event names or personal information.
- Failure behavior: the script is asynchronous and must never block rendering or navigation.
- CSP, when enabled: allow `https://tongxue.yongle.school` in `script-src` and `connect-src`.

Verification requires a production page visit, a successful `204` response from `/api/collect`, and a successful Tongxue tracking verification for work `215`.

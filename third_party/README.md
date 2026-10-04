# third_party — vendored host runtime libraries

`src/schema.ts` declares the plugin's `Config` as a schemastery schema, which
the DSH/QiLin settings service consumes (`dsh-settings` reads the plugin
module's `Config` export, derives the editable form from `.volatile()` fields,
and re-parses the serialized schema). The host runtime deliberately provides no
`@deepseek-ai/*` modules to plugins (see `scripts/smoke-plugin.mjs`), so the
schema library is vendored here and bundled into `lib/index.js`.

- `schemastery/index.mjs` — `@deepseek-ai/schemastery` 3.18.4 (MIT), copied
  verbatim from the DeepSeek Harness 0.2.0-rc.2 runtime so schema JSON stays
  byte-compatible with the host's own copy. Type surface for TypeScript lives
  in `index.d.mts` (hand-written subset).
- `cosmokit/index.js` — `@deepseek-ai/cosmokit` 1.8.5 (MIT), schemastery's
  only runtime dependency. Its `Symbol.for("cosmokit.volatile.write")`
  protocol is registry-global, so volatile config references created by the
  vendored copy are recognized by the host's own cosmokit.

Upgrade both together with the host runtime; keep the versions in sync with
the deployed DeepSeek Harness / QiLin release.

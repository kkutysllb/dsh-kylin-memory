/** Client entry: sidebar menu entry (official `sidebar.panellist` list slot) +
 * the independent main panel (official `main` keyed slot). The shell owns the
 * button, tooltip, active state, and panel switching; this plugin contributes
 * the glyph and the page — no DOM-hacked entries, no routing hacks.
 *
 * Contract: this bundle is consumed through the client module table (esbuild
 * CJS output wrapped by the build script in window.__ModuleLoader__.load),
 * `exports.inject` names the Cordis client services, and `exports.apply(ctx)`
 * registers everything inside ctx.effect-managed lifecycles.
 */
import type { ClientContext } from "./contracts.ts";
export declare const name = "dsh-kylin-memory";
export declare const inject: readonly ["slots", "locale", "connection"];
export declare function apply(ctx: ClientContext): void;

Root cause
The node_modules/@deepseek-ai/dsh-host-system-metrics symlink was missing — it was removed during the earlier git cleanup (after git rm --cached node_modules, a git clean-style pass deleted the untracked symlinks, including the one pointing to our packages/host/system-metrics).

With the package unresolvable, tsdown/rolldown silently left the import external instead of failing the build:

js
Copy
let _deepseek_ai_dsh_host_system_metrics_remote = require("@deepseek-ai/dsh-host-system-metrics/remote");
The browser module table can't answer that specifier → the ui-edex client plugin failed to load → the GUI crashed:

Copy
client-modules: require("@deepseek-ai/dsh-host-system-metrics/remote") missed the module table —
not a platform seed word, not a shell-own module, and no registered factory
That's also why every build after the cleanup "succeeded" — rolldown treats an unresolvable bare specifier as external rather than erroring.

Fix
scripts/link-harness.sh now links the repo's own @deepseek-ai packages first (they carry the committed Typert artifacts the build must use), then the harness's for everything else. Re-ran it → dsh-host-system-metrics points at packages/host/system-metrics again.
Rebuilt everything and verified the bundle: 0 external requires, the TYPERT_REMOTE contribution inlined (including the new readFile descriptor).
Verification (on my scratch server, http://127.0.0.1:3083)
hasShell: true — the eDEX frame renders, no console/page errors
Clicked .editorconfig in the filesystem browser → cell highlights, preview pane shows the file content as text (previewKind: "text")
Current state
The plugin is reinstalled in the profile with the fixed bundle (verified working on 3083).
Your main server on 3080 is still running its old boot — it needs a restart to serve the fixed bundle (I left it alone per your standing instruction). The scratch server on 3083 is available for immediate verification.
One hygiene note: I also noticed the earlier scratch-server zombie holding 3083 (from an interrupted kill) — that was my own EADDRINUSE mishap, unrelated to the plugin; it's cleaned up.
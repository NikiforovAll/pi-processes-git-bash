import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { setupProcessesCommands } from "./commands";
import { registerProcessesSettings } from "./commands/settings";
import { configLoader } from "./config";
import { setupProcessesHooks } from "./hooks";
import { ProcessManager } from "./manager";
import { setupProcessesTools } from "./tools";

/**
 * Detect whether we are running inside a Git Bash session on Windows.
 * Git Bash sets MSYSTEM (e.g. MINGW64, MINGW32, MSYS) and/or SHELL.
 */
function isGitBash(): boolean {
  const msystem = process.env.MSYSTEM ?? "";
  const shell = process.env.SHELL ?? "";
  return (
    msystem.startsWith("MINGW") ||
    msystem === "MSYS" ||
    shell.toLowerCase().includes("bash")
  );
}

export default async function (pi: ExtensionAPI) {
  if (process.platform === "win32" && !isGitBash()) {
    pi.on("session_start", async (_event, ctx) => {
      if (!ctx.hasUI) return;
      ctx.ui.notify(
        "pi-processes requires Git Bash. Please open your terminal in Git Bash and try again.",
        "warning",
      );
    });
    return;
  }

  await configLoader.load();
  const manager = new ProcessManager({
    getConfiguredShellPath: () => configLoader.getConfig().execution.shellPath,
  });

  const config = configLoader.getConfig();

  const { update: updateWidget, dockActions } = setupProcessesHooks(
    pi,
    manager,
    config,
  );
  setupProcessesCommands(pi, manager, dockActions);
  setupProcessesTools(pi, manager);
  registerProcessesSettings(pi, () => {
    updateWidget();
  });
}

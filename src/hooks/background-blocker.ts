/**
 * Blocks background bash commands (e.g. `cmd &`, `nohup cmd`) and guides
 * the model to use the process tool instead.
 *
 * Opt-in via config: `interception.blockBackgroundCommands`.
 */

import { parse } from "@aliou/sh";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { walkCommands, wordToString } from "../utils/shell-utils";

// setsid is Linux-only and not available in MSYS2/Git Bash — omitted.
const BACKGROUND_CMD_NAMES = new Set(["nohup", "disown"]);
const BACKGROUND_PATTERN = /&\s*$/;

export function setupBackgroundBlocker(pi: ExtensionAPI): void {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;

    const command = String(event.input.command ?? "");

    let hasBackground = false;
    try {
      const { ast } = parse(command);

      // Check statement-level background flag (cmd &)
      for (const stmt of ast.body) {
        if (stmt.background) {
          hasBackground = true;
          break;
        }
      }

      // Check for nohup/disown as command names
      if (!hasBackground) {
        walkCommands(ast, (cmd) => {
          const name = cmd.words?.[0] ? wordToString(cmd.words[0]) : undefined;
          if (name && BACKGROUND_CMD_NAMES.has(name)) {
            hasBackground = true;
            return true;
          }
          return false;
        });
      }
    } catch {
      // Fallback to regex on parse failure
      hasBackground = BACKGROUND_PATTERN.test(command);
    }

    if (hasBackground) {
      ctx.ui?.notify(
        "Blocked background command. Use the process tool instead.",
        "warning",
      );

      return {
        block: true,
        reason:
          "Background commands (&, nohup, disown) are not supported in bash. " +
          'Use the "process" tool with action "start" to run commands in the background. ' +
          'Example: process({ action: "start", name: "my-server", command: "npm run dev" })',
      };
    }

    return;
  });
}

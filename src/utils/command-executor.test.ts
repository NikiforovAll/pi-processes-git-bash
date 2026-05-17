import type * as nodeFs from "node:fs";
import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { resolveShellExecutable } from "./command-executor";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof nodeFs>();
  return { ...actual, existsSync: vi.fn() };
});

const existsSyncMock = vi.mocked(existsSync);
const IS_WINDOWS = process.platform === "win32";

describe("resolveShellExecutable", () => {
  it("prefers shell configured in settings when it is an existing absolute path", () => {
    existsSyncMock.mockImplementation(
      (path) => path === "/nix/store/abc-bash-5.3/bin/bash",
    );

    const resolved = resolveShellExecutable({
      configuredShell: "/nix/store/abc-bash-5.3/bin/bash",
      knownPaths: ["/bin/bash", "/usr/bin/bash"],
    });

    expect(resolved).toBe("/nix/store/abc-bash-5.3/bin/bash");
  });

  it("falls back to first existing known shell path (Unix) or 'bash' on Windows", () => {
    existsSyncMock.mockImplementation((path) => path === "/usr/bin/bash");

    const resolved = resolveShellExecutable({
      configuredShell: undefined,
      knownPaths: ["/bin/bash", "/usr/bin/bash", "/usr/local/bin/bash"],
    });

    if (IS_WINDOWS) {
      expect(resolved).toBe("bash");
    } else {
      expect(resolved).toBe("/usr/bin/bash");
    }
  });

  it("throws when no configured/known shell path exists (Unix only)", () => {
    if (IS_WINDOWS) {
      // On Windows, 'bash' is always returned from PATH — no throw expected.
      existsSyncMock.mockReturnValue(false);
      expect(() =>
        resolveShellExecutable({
          configuredShell: undefined,
          knownPaths: ["/bin/bash", "/usr/bin/bash"],
        }),
      ).not.toThrow();
    } else {
      existsSyncMock.mockReturnValue(false);
      expect(() =>
        resolveShellExecutable({
          configuredShell: undefined,
          knownPaths: ["/bin/bash", "/usr/bin/bash"],
        }),
      ).toThrow(/shell/i);
    }
  });
});

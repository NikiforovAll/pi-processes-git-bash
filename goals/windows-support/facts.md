# Facts — Windows (Git Bash) Support

## Project setup
- The current repository (this working directory) is used as the source for the new `pi-processes-git-bash` extension.
- The source files from `aliou/pi-processes` are copied into this repo as the starting point.
- The npm package name is updated to `@<owner>/pi-processes-git-bash`.
- All existing features are preserved; only the Windows-incompatible code is changed.

## Scope
- Only Windows-incompatible code is touched; all other behaviour is unchanged.
- Git Bash is the only supported Windows shell.

## Shell detection
- On Windows, the extension reads `process.env.SHELL` to locate the shell executable.
- If `SHELL` is not set or the resolved path does not exist, the extension throws a clear startup error telling the user to run Pi from inside a Git Bash terminal.
- On Unix, existing shell resolution logic (`DEFAULT_KNOWN_SHELL_PATHS` + settings override) is unchanged.

## Process spawning
- On Windows, spawned processes use `windowsHide: true` so no extra console window appears.
- `detached: true` is kept on all platforms (child can outlive the parent session).
- The `-lc` shell flags work unchanged because the shell is bash on both platforms.

## Process liveness check
- On Unix, liveness is checked via `process.kill(-pgid, 0)` (process group, signal 0).
- On Windows, liveness is checked via `process.kill(pid, 0)` (positive PID, signal 0).

## Process kill
- On Unix, killing uses `process.kill(-pgid, signal)` targeting the entire process group (unchanged).
- On Windows, killing uses `taskkill /F /T /PID <pid>`, which terminates the process and its entire child tree.
- The `signal` argument passed to `kill()` is ignored on Windows (taskkill always force-terminates).

## Error messaging
- If Git Bash is not detected on Windows at startup, the error message explicitly says: "pi-processes requires Git Bash. Please open your terminal in Git Bash and try again."

# Plan — Windows (Git Bash) Support

## Solution approach

Copy the `aliou/pi-processes` source into this repo, rename the package, then surgically patch the four Unix-only hotspots. No new abstractions are introduced; each hotspot gets an inline `process.platform === "win32"` branch. A Git Bash presence check replaces the existing Windows bail-out in `src/index.ts`.

---

## Ordered Steps

### Step 1 — Copy source files from cloned upstream
**Files/systems:** working directory root  
Copy all upstream files from the locally-cloned `aliou/pi-processes` into the current directory. Exclude `.git/` so the working repo stays independent.

**Command:**
```bash
cp -r C:/Users/nikiforovall/AppData/Local/Temp/pi-github-repos/aliou/pi-processes/. .
```

**Verification:**
```bash
ls src/ skills/ package.json tsconfig.json
```

---

### Step 2 — Rename the package
**Files:** `package.json`, `README.md`

- `name`: `"@aliou/pi-processes"` → `"pi-processes-git-bash"`
- `repository.url`: update to this repo's URL (or remove)
- `README.md` platform table: change Windows row from `not supported` → `supported (Git Bash required)`

**Verification:**
```bash
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(p.name)"
grep "Windows" README.md
```

---

### Step 3 — Fix process liveness & kill (`src/utils/process-group.ts`)
**File:** `src/utils/process-group.ts`

Two functions need Windows branches:

**`isProcessGroupAlive`**
- Unix (unchanged): `process.kill(-pgid, 0)` — signal 0 to the process group
- Windows: `process.kill(pgid, 0)` — signal 0 to positive PID (Node.js supports this on win32)

**`killProcessGroup`**
- Unix (unchanged): `process.kill(-pgid, signal)` — signal entire group
- Windows: `execSync(\`taskkill /F /T /PID ${pgid}\`)` — force-kill process + all children

Add `import { execSync } from "node:child_process"` at the top.

**Verification:**
```bash
grep -n "win32\|taskkill\|execSync" src/utils/process-group.ts
```

---

### Step 4 — Fix shell resolution & spawn options (`src/utils/command-executor.ts`)
**File:** `src/utils/command-executor.ts`

**`resolveShellExecutable`**
- Add a Windows-first branch: if `process.platform === "win32"`, return `"bash"` directly (Git Bash puts `bash.exe` on PATH; the existing `configuredShell` override still applies first).
- Unix path (unchanged): iterate `DEFAULT_KNOWN_SHELL_PATHS`.

**`spawnCommand`**
- Add `windowsHide: true` to the `spawn` options object when `process.platform === "win32"` to suppress any console popup.

**Verification:**
```bash
grep -n "win32\|windowsHide\|bash" src/utils/command-executor.ts
```

---

### Step 5 — Replace Windows bail-out with Git Bash detection (`src/index.ts`)
**File:** `src/index.ts`

Current code bails out on all of `win32` with a generic "not available on Windows" notice. Replace it with:

1. On `win32`, check for Git Bash by testing `process.env.MSYSTEM` (Git Bash sets this to `MINGW64`, `MINGW32`, or `MSYS`) **or** `process.env.SHELL` containing `"bash"`.
2. If neither is set → show the friendly error: `"pi-processes requires Git Bash. Please open your terminal in Git Bash and try again."` and return.
3. If Git Bash is detected → fall through to the normal startup path (no special casing needed from this point on, the fixed utils handle it).

**Verification:**
```bash
grep -n "MSYSTEM\|SHELL\|Git Bash\|win32" src/index.ts
```

---

### Step 6 — Update platform support in README
**File:** `README.md`

Change the platform support section from:
```
- Windows: not supported
```
to:
```
- Windows: supported (requires Git Bash)
```

**Verification:**
```bash
grep -A3 "Platform support" README.md
```

---

## Risks & Open Questions

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | `taskkill` is not on PATH in some minimal Git Bash setups | `taskkill.exe` lives in `C:\Windows\System32` which is always on PATH in Git Bash |
| 2 | `process.kill(pid, 0)` on Windows throws if the PID is a zombie/completed process | The existing `EPERM` catch already handles this correctly |
| 3 | `detached: true` on Windows opens a new console window | Mitigated by `windowsHide: true` added in Step 4 |
| 4 | Git Bash MSYSTEM is `MSYS` in some configurations (e.g. git-sdk) | Checking prefix `MSYSTEM?.startsWith("MINGW") \|\| === "MSYS"` covers all cases |
| 5 | Existing tests in `src/utils/command-executor.test.ts` and `src/manager.test.ts` are Unix-only | Tests pass unchanged on Unix CI; Windows test coverage is out of scope for this goal |

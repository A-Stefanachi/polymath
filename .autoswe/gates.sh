#!/usr/bin/env bash
# autoswe-gates-format: 3
# GENERATED from .autoswe/toolchain.json by autoswe toolchain.py. Edit the JSON, then re-render:
#   python3 "$AUTOSWE_TOOLCHAIN" render
# Contract: exit 0 = every gate passed. One line per gate; full logs in .autoswe/logs/.
#   bash .autoswe/gates.sh                              all gates on the whole repo (CI)
#   FAST=1 bash .autoswe/gates.sh                       skip slow gates (file-based ones still run on changed files)
#   AUTOSWE_GATE_SCOPE=changed bash .autoswe/gates.sh   file-based gates only on files changed since
#                                                       AUTOSWE_GATE_BASE (default HEAD; a commit or tree)
#   bash .autoswe/gates.sh --hook NAME [FILE...]        one tool on the given files (pre-commit)
#   AUTOSWE_GATE_CACHE=0 bash .autoswe/gates.sh         run even if this exact tree already passed
# Full runs use git's file list (tracked + untracked, not ignored) minus the toolchain's exclude.
# Cache: a full pass records the working tree's git hash (minus cache_ignore) in the git directory;
# a later run of any scope on the same tree passes at once.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
LOG_DIR=.autoswe/logs
SCOPE="${AUTOSWE_GATE_SCOPE:-full}"
BASE="${AUTOSWE_GATE_BASE:-HEAD}"
failed=()
F=()
POOL=()
POOL_READY=0
HOOK=""
HOOK_FOUND=0
HOOK_ARGS=()
if [[ "${1:-}" == --hook ]]; then
  HOOK="${2:-}"
  if [[ -z "$HOOK" ]]; then echo "usage: gates.sh --hook NAME [FILE...]" >&2; exit 2; fi
  shift 2
  HOOK_ARGS=("$@")
else
  mkdir -p "$LOG_DIR"
fi

# File lists are NUL-separated: no quoting of non-ASCII or special characters in names.
all_files() { git ls-files -z --cached --others --exclude-standard; }
changed_files() {
  if git rev-parse -q --verify "$BASE^{tree}" >/dev/null 2>&1; then
    git diff -z --name-only --diff-filter=ACMRT "$BASE" --
  else
    # no commits yet (or an unknown base): every tracked or staged file
    if [[ "$BASE" != HEAD ]]; then echo "note: base $BASE not found; checking all files" >&2; fi
    git ls-files -z --cached
  fi
  git ls-files -z --others --exclude-standard
}
# POOL: the files in scope (hook arguments, changed files or all files) that exist and aren't excluded
load_pool() {
  local f LC_ALL=C
  POOL_READY=1
  while IFS= read -r -d '' f; do
    if [[ ! "$f" =~ $EXCLUDE_RE && -f "$f" ]]; then POOL+=("$f"); fi
  done < <(if [[ -n "$HOOK" ]]; then printf '%s\0' ${HOOK_ARGS[@]+"${HOOK_ARGS[@]}"}
           elif [[ "$SCOPE" == changed ]]; then changed_files; else all_files; fi)
}
# select_files REGEX: F = the files in POOL that match REGEX
select_files() {
  local f LC_ALL=C
  ((POOL_READY)) || load_pool
  F=()
  for f in ${POOL[@]+"${POOL[@]}"}; do
    if [[ "$f" =~ $1 ]]; then F+=("$f"); fi
  done
}
# run_batched FUNC: FUNC with the files in F as arguments, in batches that keep command lines short
run_batched() {
  local f rc=0 size=0 batch=()
  for f in ${F[@]+"${F[@]}"}; do
    if ((${#batch[@]} > 0 && size + ${#f} > ARG_BUDGET)); then "$1" "${batch[@]}" || rc=1; batch=(); size=0; fi
    batch+=("$f")
    size=$((size + ${#f} + 1))
  done
  if ((${#batch[@]} > 0)); then "$1" "${batch[@]}" || rc=1; fi
  return "$rc"
}
gate() {
  local name="$1" start=$SECONDS log
  shift
  log="$LOG_DIR/$name.log"
  : >"$LOG_DIR/.$name.start"
  if "$@" >"$log" 2>&1; then
    printf 'PASS %-14s %3ss\n' "$name" "$((SECONDS - start))"
  else
    printf 'FAIL %-14s %3ss  (full log: %s)\n' "$name" "$((SECONDS - start))" "$log"
    tail -n 25 "$log" | sed 's/^/    /'
    keep_evidence "$name"
    failed+=("$name")
  fi
  rm -f "$LOG_DIR/.$name.start"
}
# keep_evidence NAME: copy the failure snapshots a test runner wrote during this gate (Playwright's
# test-results/**/error-context.md at the root or one level down, which its next run deletes) to
# .autoswe/logs/evidence/, so a failure that passes on a re-run can still be read. The 20 newest copies
# are kept. Bash globs, not find: on Windows `find` can be find.exe.
keep_evidence() {
  local dest="" f n=0 old
  local -a found=()
  shopt -s globstar nullglob
  found=(test-results/**/error-context.md */test-results/**/error-context.md)
  shopt -u globstar nullglob
  for f in ${found[@]+"${found[@]}"}; do
    if [[ "$LOG_DIR/.$1.start" -nt "$f" ]]; then continue; fi  # older than this run (same second counts as new)
    if [[ -z "$dest" ]]; then dest="$LOG_DIR/evidence/$1-$(date +%Y%m%dT%H%M%S)"; fi
    mkdir -p "$dest/$(dirname "$f")" && cp "$f" "$dest/$f" && n=$((n + 1))
  done
  if ((n)); then
    printf '    %s failure snapshot(s) kept in %s\n' "$n" "$dest"
    # shellcheck disable=SC2012  # names are ours: no spaces or newlines
    ls -1dt "$LOG_DIR"/evidence/*/ 2>/dev/null | tail -n +21 | while IFS= read -r old; do rm -rf "$old"; done
  fi
}
skip() { printf 'SKIP %-14s %s\n' "$1" "$2"; }
available() {  # available REQUIRES PATH: PATH ('-' for none) is the command's own project-local path
  local p
  if [[ "$2" != - ]]; then p=$(local_bin "$2"); [[ -x "$p" || -x "$p.exe" ]]; return; fi
  command -v "$1" >/dev/null 2>&1 || [[ -x "node_modules/.bin/$1" || -x ".venv/bin/$1" || -x ".venv/Scripts/$1" || -x ".venv/Scripts/$1.exe" ]]
}
local_bin() {  # local_bin PATH: a project-local command; .venv/bin/X is .venv/Scripts/X in a Windows virtualenv
  local w="${1/venv\/bin\//venv/Scripts/}"
  if [[ ! -e "$1" && "$w" != "$1" ]] && [[ -e "$w" || -e "$w.exe" ]]; then printf '%s\n' "$w"; else printf '%s\n' "$1"; fi
}
not_installed() {  # not_installed NAME WHAT OPTIONAL
  if [[ "$3" == 1 ]]; then skip "$1" "($2 not installed)"; return; fi
  printf 'FAIL %-14s %s is not installed\n' "$1" "$2"
  failed+=("$1")
}
# file_gate NAME REGEX REQUIRES PATH OPTIONAL SLOW FUNC FULL_FUNC
#   FUNC gets the selected files as arguments; FULL_FUNC ('-' for none) is the tool's whole-repo
#   command, used instead in full runs. SLOW: skipped with FAST=1 in full runs only.
file_gate() {
  local name="$1" regex="$2" req="$3" path="$4" optional="$5" slow="$6" func="$7" full="$8" what="$3"
  if [[ "$path" != - ]]; then what="$path"; fi
  if [[ -n "$HOOK" ]]; then
    [[ "$HOOK" == "$name" ]] || return 0
    HOOK_FOUND=1
    if ! available "$req" "$path"; then not_installed "$name" "$what" "$optional"; return 0; fi
    select_files "$regex"
    if ((${#F[@]})) && ! run_batched "$func"; then failed+=("$name"); fi
    return 0
  fi
  if [[ "$slow" == 1 && "${FAST:-0}" == 1 && "$SCOPE" != changed ]]; then skip "$name" "(FAST=1)"; return 0; fi
  if ! available "$req" "$path"; then not_installed "$name" "$what" "$optional"; return 0; fi
  select_files "$regex"
  if ((${#F[@]} == 0)); then skip "$name" "(no matching files)"
  elif [[ "$SCOPE" != changed && "$full" != - ]]; then gate "$name" "$full"
  else gate "$name" run_batched "$func"; fi
}
# repo_gate NAME REQUIRES PATH OPTIONAL SLOW FUNC [CHANGED_FUNC]: one whole-repo run in every scope;
#   CHANGED_FUNC ('-' or absent for none) replaces FUNC in changed-scope runs (the Stop hook)
repo_gate() {
  local name="$1" req="$2" path="$3" optional="$4" slow="$5" func="$6" changed="${7:--}" what="$2"
  if [[ "$path" != - ]]; then what="$path"; fi
  if [[ -n "$HOOK" ]]; then
    [[ "$HOOK" == "$name" ]] || return 0
    HOOK_FOUND=1
    if ! available "$req" "$path"; then not_installed "$name" "$what" "$optional"
    elif ! "$func"; then failed+=("$name"); fi
    return 0
  fi
  if [[ "$slow" == 1 && "${FAST:-0}" == 1 ]]; then skip "$name" "(FAST=1)"; return 0; fi
  if ! available "$req" "$path"; then not_installed "$name" "$what" "$optional"; return 0; fi
  if [[ "$SCOPE" == changed && "$changed" != - ]]; then gate "$name" "$changed"; else gate "$name" "$func"; fi
}
# tree_hash: git's hash of the working tree as the gates see it (tracked and untracked files that
# aren't ignored, minus CACHE_IGNORE), built in a temporary index so the real one is untouched
tree_hash() {
  local tmp idx rc
  idx=$(git rev-parse --git-path index 2>/dev/null) || return 1
  tmp=$(mktemp 2>/dev/null) || return 1
  if [[ -f "$idx" ]]; then cp "$idx" "$tmp" || { rm -f "$tmp"; return 1; }; else rm -f "$tmp"; fi
  {
    GIT_INDEX_FILE="$tmp" git add -A -- . &&
      if ((${#CACHE_IGNORE[@]})); then
        GIT_INDEX_FILE="$tmp" git rm -r -q --cached --ignore-unmatch -- "${CACHE_IGNORE[@]/#/:(glob)}" >/dev/null
      fi &&
      GIT_INDEX_FILE="$tmp" git write-tree
  } 2>/dev/null
  rc=$?
  rm -f "$tmp"
  return "$rc"
}
EXCLUDE_RE='(^node_modules/.*$)|(^\.venv/.*$)|(^venv/.*$)|(^vendor/.*$)|(^dist/.*$)|(^build/.*$)|(^\.autoswe/.*$)|(^specs/[^/]*/tasks\.json$)|(^(.*/)?[^/]*\.min\.js$)|(^polymath-app-spec/.*$)|(^(.*/)?pnpm-lock\.yaml$)|(^(.*/)?next-env\.d\.ts$)|(^\.next/.*$)'
ARG_BUDGET=60000
CACHE_IGNORE=('specs/**/*.md' '.autoswe/logs/**' .autoswe/state.json .autoswe/STOP .autoswe/STEER.md '.claude/agent-memory/**')
CACHE_KEY=autoswe-gates-3
case "${OSTYPE:-}" in
  msys* | cygwin* | win*)  # Git Bash on Windows
    ARG_BUDGET=24000  # a Windows command line holds 32767 characters
    # the matcher (native Windows Python) runs the scanners through this bash, as the gates do
    if [[ -z "${AUTOSWE_BASH:-}" ]]; then AUTOSWE_BASH=$(cygpath -w "$BASH" 2>/dev/null) && export AUTOSWE_BASH; fi ;;
esac
GATE_STAMP=""
GATE_TREE=""
if [[ -z "$HOOK" ]] && GATE_STAMP=$(git rev-parse --git-path autoswe/gate-stamp 2>/dev/null); then
  GATE_TREE=$(tree_hash) || GATE_TREE=""
  if [[ -n "$GATE_TREE" && "${AUTOSWE_GATE_CACHE:-1}" != 0 && -f "$GATE_STAMP" &&
        "$(cat "$GATE_STAMP" 2>/dev/null)" == "$CACHE_KEY $GATE_TREE" ]]; then
    echo "ALL GATES PASSED (cached: this tree passed a full run; AUTOSWE_GATE_CACHE=0 runs the gates again)"
    exit 0
  fi
fi

# matcher PARSER KIND BASELINE MODE -- COMMAND...: run a security scanner's JSON report on the
# files given NUL-separated on stdin; fail only on findings the baseline doesn't accept. Findings
# match baseline entries by file, rule and a hash of the flagged line's text, as a multiset: a moved
# finding stays accepted, an added one of the same kind fails. AUTOSWE_MATCHER is the matcher in
# autoswe's toolchain.py (norm_path ... gate_main), copied verbatim.
# The matcher needs Python 3.8+: $AUTOSWE_PYTHON, else the first of python3, python and `py -3`
# that runs (on Windows python3 is often the Microsoft Store stub).
PY=()
if [[ -n "${AUTOSWE_PYTHON:-}" ]]; then PY=("$AUTOSWE_PYTHON"); fi
for _c in python3 python "py -3"; do
  if ((${#PY[@]})); then break; fi
  # shellcheck disable=SC2086  # "py -3" is two words
  if command -v "${_c%% *}" >/dev/null 2>&1 && $_c -c 'import sys; sys.exit(sys.version_info < (3, 8))' >/dev/null 2>&1; then
    read -r -a PY <<<"$_c"
  fi
done
matcher() {
  if ((${#PY[@]} == 0)); then echo "Python 3.8+ not found (python3, python, py -3; or set AUTOSWE_PYTHON): it compares the findings with the baseline"; return 2; fi
  PYTHONUTF8=1 "${PY[@]}" -c "$AUTOSWE_MATCHER" "$@"
}
IFS= read -r -d '' AUTOSWE_MATCHER <<'AUTOSWE_PY' || true
import hashlib, json, os, re, shlex, shutil, subprocess, sys, tempfile
GITLEAKS_IDENTITY = '#autoswe '
def norm_path(path, root=None):
    """Repo-relative, '/'-separated on every OS: Windows tools report backslashes (bandit: .\\scripts/x.py) and a
    baseline recorded on Windows is matched on Linux CI. A POSIX file name with a backslash in it would not match."""
    path = str(path or "")
    if root is not None and os.path.isabs(path):
        try:
            path = os.path.relpath(path, str(root))
        except ValueError:
            pass
    path = path.replace("\\", "/")
    while path.startswith("./"):
        path = path[2:]
    return path.lstrip("/")

def parse_findings(parser, raw, root=None):
    """JSON report -> [{file, start, end, rule, text}] (text is the one-line summary, start the
    flagged line), or None if unparsable."""
    findings = []
    try:
        data = json.loads(raw) if raw.strip() else []
    except json.JSONDecodeError:
        return None
    try:
        if parser == "bandit":
            for r in (data or {}).get("results", []):
                path = norm_path(r.get("filename"), root)
                rng = r.get("line_range") or [r.get("line_number") or 0]
                findings.append({"file": path, "start": r.get("line_number") or rng[0], "end": rng[-1], "rule": r.get("test_id"),
                                 "text": f"{(r.get('issue_severity') or '?')[:4]:4} {path}:{r.get('line_number')} "
                                         f"{r.get('test_id')} {(r.get('issue_text') or '').strip()}"})
        elif parser == "checkov":
            for block in data if isinstance(data, list) else [data]:
                for f in ((block or {}).get("results") or {}).get("failed_checks", []):
                    rng = f.get("file_line_range") or [0]
                    # repo_file_path is relative to the scanned directory, with a leading '/' (-d . and -f alike)
                    path = norm_path(f.get("repo_file_path") or f.get("file_path"))
                    findings.append({"file": path, "start": rng[0], "end": rng[-1], "rule": f.get("check_id"),
                                     "resource": f.get("resource") or "",
                                     "text": f"{(f.get('severity') or 'FAIL')[:4]:4} {path}:{rng[0]} "
                                             f"{f.get('check_id')} {f.get('resource')} - {(f.get('check_name') or '').strip()}"})
        elif parser == "gitleaks":
            for f in data or []:
                path = norm_path(f.get("File"), root)
                # gitleaks dir's fingerprint is file:rule:line; rebuilt from the normalized path so it reads the same on every OS
                fp = f"{path}:{f.get('RuleID')}:{f.get('StartLine')}" if not f.get("Commit") else f.get("Fingerprint")
                findings.append({"file": path, "start": f.get("StartLine"), "end": f.get("EndLine") or f.get("StartLine"),
                                 "rule": f.get("RuleID"), "fingerprint": fp,
                                 "text": f"SECR {path}:{f.get('StartLine')} {f.get('RuleID')} (fingerprint {fp})"})
    except (AttributeError, TypeError):
        return None
    return findings

def line_hash(text):
    """Short hash of a line's whitespace-trimmed text: baselines never store the text (or a secret)."""
    return hashlib.sha256(text.strip().encode("utf-8", "surrogateescape")).hexdigest()[:16]

def resource_key(resource):
    """A checkov resource as both `checkov -d .` and `checkov -f FILE` name it: without the
    module path (`module.site.aws_s3_bucket.site` -> `aws_s3_bucket.site`) and without the leading
    '/' that -d gives paths in Dockerfile resources (`/svc/Dockerfile.RUN`)."""
    return re.sub(r"^(module\.[^.\[]+(\[[^\]]*\])?\.)+", "", str(resource or "")).lstrip("/")

def finding_key(finding, lines):
    """(rule, what the finding is about): for checkov its resource (resource_key), otherwise a hash
    of the flagged line's text (bandit's line_number, gitleaks' StartLine), the same wherever the
    line moves."""
    if "resource" in finding:
        return finding.get("rule"), resource_key(finding["resource"])
    start = finding.get("start") or 0
    return finding.get("rule"), line_hash(lines[start - 1] if 0 < start <= len(lines) else "")

def read_lines(root, rel, cache):
    """A file's lines split on \\n only, as the scanners number them."""
    if rel not in cache:
        try:
            with open(os.path.join(str(root), rel), encoding="utf-8", errors="surrogateescape", newline="") as fh:
                cache[rel] = fh.read().split("\n")
        except OSError:
            cache[rel] = []
    return cache[rel]

def git_out(args, root):
    try:
        out = subprocess.run(["git", *args], cwd=str(root), capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout if out.returncode == 0 else None

def load_baseline(kind, path, root):
    """Accepted findings: [{"identity": (file, rule, line hash) or None, "fingerprint": str or None}].
    bandit: a bandit JSON report; each result's identity comes from its `code` field (which always
    holds the line_number line). gitleaks: .gitleaksignore. A `#autoswe HASH RULE FILE` line is an
    identity and the fingerprint line after it is gitleaks' own copy (skipped). An older bare
    `file:rule:line` fingerprint becomes the identity of the text that line had when the baseline
    file was last committed (the working tree's text when it has uncommitted changes), or matches
    exactly when that line can't be found."""
    entries = []
    try:
        with open(os.path.join(str(root), path), encoding="utf-8", errors="surrogateescape") as fh:
            text = fh.read()
    except OSError:
        return entries
    if kind == "bandit":
        try:
            results = json.loads(text).get("results") or []
        except (ValueError, AttributeError):
            return entries
        for r in results:
            code = {}
            for line in (r.get("code") or "").split("\n"):
                m = re.match(r"^(\d+) ?(.*)$", line)
                if m:
                    code[int(m.group(1))] = m.group(2)
            identity = (norm_path(r.get("filename"), root), r.get("test_id"), line_hash(code.get(r.get("line_number") or 0, "")))
            entries.append({"identity": identity, "fingerprint": None})
        return entries
    if kind == "checkov":
        try:
            data = json.loads(text)  # checkov's own --create-baseline format (autoswe 0.3)
        except ValueError:
            data = None
        if isinstance(data, dict):
            for item in data.get("failed_checks") or []:
                for found in item.get("findings") or []:
                    for check in found.get("check_ids") or []:
                        entries.append({"identity": (norm_path(item.get("file")), check, resource_key(found.get("resource"))), "fingerprint": None})
            return entries
        for line in text.split("\n"):  # `CHECK_ID RESOURCE FILE`, shell-quoted when needed
            if line.strip() and not line.strip().startswith("#"):
                try:
                    check, resource, file = shlex.split(line)
                except ValueError:
                    continue
                entries.append({"identity": (norm_path(file), check, resource_key(resource)), "fingerprint": None})
        return entries
    if kind != "gitleaks":
        return entries
    twin, legacy = None, []
    for line in text.split("\n"):
        s = line.strip()
        if s.startswith(GITLEAKS_IDENTITY):
            parts = s.split(" ", 3)
            if len(parts) == 4:
                entries.append({"identity": (parts[3], parts[2], parts[1]), "fingerprint": None})
                twin = f"{parts[3]}:{parts[2]}:"
            continue
        if not s or s.startswith("#"):
            continue
        if twin and s.startswith(twin) and s[len(twin):].isdigit():
            twin = None
            continue
        twin = None
        parts = s.split(":")
        if len(parts) == 3 and parts[2].isdigit():  # commit fingerprints (gitleaks git) never match a directory scan
            legacy.append((parts[0].replace("\\", "/"), parts[1], int(parts[2])))
    if legacy:
        commit, status = None, git_out(["status", "--porcelain", "--", path], root)
        if status is not None and not status.strip():
            out = git_out(["log", "-1", "--format=%H", "--", path], root)
            commit = out.decode().strip() if out else None
        contents, current = {}, {}
        for file, rule, num in legacy:
            if file not in contents:
                blob = git_out(["cat-file", "blob", f"{commit}:{file}"], root) if commit else None
                contents[file] = blob.decode("utf-8", "surrogateescape").split("\n") if blob is not None else read_lines(root, file, current)
            lines = contents[file]
            if 0 < num <= len(lines):
                entries.append({"identity": (file, rule, line_hash(lines[num - 1])), "fingerprint": None})
            else:  # the line is gone: gitleaks' own exact match
                entries.append({"identity": None, "fingerprint": f"{file}:{rule}:{num}"})
    return entries

def match_baseline(findings, entries, root):
    """(new, accepted). Each baseline entry accepts at most one finding (a multiset): by identity
    (file, rule, flagged-line hash), or by exact gitleaks fingerprint for an entry without one."""
    cache, free, by_id, by_print = {}, set(range(len(entries))), {}, {}
    for i, e in enumerate(entries):
        if e["identity"]:
            by_id.setdefault(tuple(e["identity"]), []).append(i)
        if e["fingerprint"]:
            by_print.setdefault(e["fingerprint"], []).append(i)
    accepted, rest, new = [], [], []
    for f in findings:
        ident = (f.get("file"),) + finding_key(f, read_lines(root, f["file"], cache)) if f.get("file") and f.get("rule") else None
        i = next((i for i in by_id.get(ident, []) if i in free), None)
        if i is None:
            rest.append(f)
        else:
            free.discard(i)
            accepted.append(f)
    for f in rest:
        i = next((i for i in by_print.get(f.get("fingerprint"), []) if i in free), None)
        if i is None:
            new.append(f)
        else:
            free.discard(i)
            accepted.append(f)
    return new, accepted

def run_capture(argv, root, timeout=None):
    """(exit code, stdout, stderr) of `argv` run in `root`, decoded as UTF-8, \r\n read as \n.
    Output goes to temporary files and a timeout (exit 124) ends the whole process tree, so a
    tool started by a shell script can't keep the call waiting. On Windows the command runs in
    Git Bash ($AUTOSWE_BASH) from a script file, so tools resolve as in gates.sh (npm's sh shims,
    shebang scripts, X.exe for X) and no file name goes through Windows command-line parsing;
    a virtualenv's .venv/bin/X is .venv/Scripts/X there."""
    script = None
    if os.name == "nt":
        bash = os.environ.get("AUTOSWE_BASH")
        if not bash:
            return 127, "", "Git Bash not found: on Windows autoswe runs tools in it (install Git for Windows or set CLAUDE_CODE_GIT_BASH_PATH)"
        argv = [str(a) for a in argv]
        m = re.match(r"^((?:\./)?\.?venv)/bin/(.+)$", argv[0])
        if m and not os.path.exists(os.path.join(str(root), argv[0])):
            twin = f"{m.group(1)}/Scripts/{m.group(2)}"
            if os.path.exists(os.path.join(str(root), twin)) or os.path.exists(os.path.join(str(root), twin + ".exe")):
                argv[0] = twin
        fd, script = tempfile.mkstemp(prefix="autoswe-", suffix=".sh")
        with os.fdopen(fd, "w", encoding="utf-8", errors="surrogateescape", newline="\n") as fh:
            fh.write(" ".join(shlex.quote(a) for a in argv) + "\n")
        argv = [bash, script.replace("\\", "/")]
    try:
        with tempfile.TemporaryFile() as out, tempfile.TemporaryFile() as err:
            try:
                proc = subprocess.Popen(argv, cwd=str(root), stdin=subprocess.DEVNULL, stdout=out, stderr=err,
                                        start_new_session=hasattr(os, "killpg"))
            except OSError as exc:
                return 127, "", f"{argv[0]}: {exc}"
            timed_out = False
            try:
                code = proc.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                timed_out, code = True, 124
                if hasattr(os, "killpg"):
                    try:
                        os.killpg(proc.pid, 9)
                    except OSError:
                        proc.kill()
                else:  # killing bash.exe would leave the tools it started running
                    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True)
                proc.wait()
            texts = []
            for fh in (out, err):
                fh.seek(0)
                texts.append(fh.read().decode("utf-8", "replace").replace("\r\n", "\n"))
        return code, texts[0], texts[1] + (f"\ntimed out after {timeout}s" if timed_out else "")
    finally:
        if script:
            try:
                os.remove(script)
            except OSError:
                pass

def run_marked(words, targets, mode, parser, root, timeout=None):
    """Run a JSON report command -> (findings, error line). In `words`, @REPORT@ is a temporary
    report path (else the report is stdout), @TARGET@ takes one target per run (mode 'each'),
    @TARGETS@ all of them in batches (mode 'batch'; @TARGETS_WITH:FLAG@ puts FLAG before each),
    @NOIGNORE@ turns gitleaks' .gitleaksignore off except when the target is the repo root '.'.
    Mode 'full': the targets are the tool's literal full-run words (`-d .`), passed once as they are."""
    if mode != "full":
        targets = ["./" + t if t.startswith("-") else t for t in targets]
    if mode == "full":
        groups = [list(targets)]
    elif mode == "batch":
        groups, size = [[]], 0
        for t in targets:
            if groups[-1] and size + len(t) > (24000 if os.name == "nt" else 60000):  # keep command lines short
                groups.append([])
                size = 0
            groups[-1].append(t)
            size += len(t) + 1
        groups = [g for g in groups if g]
    else:
        groups = [[t] for t in targets]
    findings, tmp = [], tempfile.mkdtemp(prefix="autoswe-")
    report = os.path.join(tmp, "report.json")
    no_ignore = os.path.join(tmp, "empty.gitleaksignore")  # an empty ignore file: the same on every OS
    open(no_ignore, "w").close()
    try:
        for group in groups:
            if mode != "full" and not os.path.exists(os.path.join(str(root), group[0])):
                return findings, f"{group[0]}: no such file"
            argv = []
            for w in words:
                if w in ("@TARGET@", "@TARGETS@"):
                    argv += group
                elif w.startswith("@TARGETS_WITH:"):
                    argv += group if mode == "full" else [x for t in group for x in (w[len("@TARGETS_WITH:"):-1], t)]
                elif w == "@NOIGNORE@":
                    argv += [] if group == ["."] else ["--gitleaks-ignore-path", no_ignore.replace("\\", "/")]
                else:
                    argv.append(report.replace("\\", "/") if w == "@REPORT@" else w)
            code, stdout, stderr = run_capture(argv, root, timeout)
            if code == 124 and stderr.endswith(f"timed out after {timeout}s"):
                return findings, f"{argv[0]} timed out after {timeout}s"
            if code == 127 and not stdout.strip():
                return findings, f"{argv[0]} could not run (exit 127): " + (stderr.strip().splitlines() or [""])[-1][:160]
            raw = stdout
            if "@REPORT@" in words:
                try:
                    with open(report, encoding="utf-8", errors="replace") as fh:
                        raw = fh.read()
                    os.remove(report)
                except OSError:
                    raw = ""
            parsed = parse_findings(parser, raw, root) if raw.strip() else ([] if code == 0 else None)
            if parsed is None:
                lines = [l.strip() for l in (stderr + "\n" + stdout).splitlines() if l.strip()]
                return findings, f"{argv[0]} could not run (exit {code})" + (f": {lines[0][:160]}" if lines else "")
            findings += parsed
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return findings, None

def scan_targets(words, targets, mode, parser, kind, path, root, timeout=None, keep=None):
    """Findings on `targets` with no baseline applied. Mode 'root' is a full run of a
    one-target-per-run tool: '.' once, which for gitleaks applies .gitleaksignore (it reads the one
    in the directory it scans), then the top-level entries holding a fingerprint from it again
    without, their findings replacing the first run's (fewer runs than one per entry: ~0.7 s each).
    Mode 'each_root' (changed files of such a tool): 'each' for up to 5 targets, else one 'root' run
    with the findings outside the targets dropped. gitleaks takes 3-4 s per run on Windows, so a
    session that changed 100 files spent 6-9 minutes on per-file runs; the root scan takes ~14 s."""
    if mode == "each_root":
        if len(targets) <= 5:
            return run_marked(words, targets, "each", parser, root, timeout)
        wanted = {norm_path(t) for t in targets}
        findings, err = scan_targets(words, ["."], "root", parser, kind, path, root, timeout, keep=wanted)
        return [f for f in findings if norm_path(f["file"], root) in wanted], err
    if kind == "checkov" and mode == "batch":
        # A Terraform module is its directory: checkov -f sees only the files it is given, so a
        # bucket's logging resource in a sibling file would go unseen. Scan the module's .tf files.
        more = []
        for t in targets:
            if t.endswith((".tf", ".tf.json")):
                d = os.path.dirname(t)
                try:
                    names = sorted(os.listdir(os.path.join(str(root), d or ".")))
                except OSError:
                    names = []
                # Repo paths use '/' on every OS (os.path.join would give modules\\x.tf on Windows: a duplicate target).
                more += [f"{d}/{n}" if d else n for n in names if n.endswith((".tf", ".tf.json")) and os.path.isfile(os.path.join(str(root), d, n))]
        targets = list(dict.fromkeys(list(targets) + more))
    if mode != "root":
        return run_marked(words, targets, mode, parser, root, timeout)
    findings, err = run_marked(words, ["."], "each", parser, root, timeout)
    redo = set()
    if kind == "gitleaks" and not err:
        try:
            with open(os.path.join(str(root), path), encoding="utf-8", errors="surrogateescape") as fh:
                for line in fh:
                    parts = line.strip().split(":")
                    if not line.strip().startswith("#") and len(parts) == 3 and parts[0]:
                        redo.add(parts[0].replace("\\", "/").lstrip("/").split("/")[0])
        except OSError:
            pass
        redo = {t for t in redo if t not in (".", "..") and os.path.exists(os.path.join(str(root), t))}
        if keep is not None:  # only the entries whose findings are kept
            redo &= {k.split("/")[0] for k in keep}
    if not redo:
        return findings, err
    again, err = run_marked(words, sorted(redo), "each", parser, root, timeout)
    return [f for f in findings if f["file"].split("/")[0] not in redo] + again, err

def gate_main(args):
    """gates.sh `matcher PARSER KIND BASELINE MODE -- WORD...`, targets NUL-separated on stdin.
    Prints the findings the baseline doesn't accept; exit 0 none, 1 some, 2 the scanner could not run."""
    parser, kind, path, mode, words = args[0], args[1], args[2], args[3], args[5:]
    targets = [os.fsdecode(t) for t in sys.stdin.buffer.read().split(b"\0") if t]
    if not targets:
        return 0
    root = os.getcwd()
    findings, err = scan_targets(words, targets, mode, parser, kind, path, root)
    if err:
        print(err)
        return 2
    new, accepted = match_baseline(findings, load_baseline(kind, path, root), root)
    for text in dict.fromkeys(f["text"] for f in new):
        print(text)
    note = f" ({len(accepted)} accepted by {path})" if accepted else ""
    print(f"{len(new)} new finding(s){note}" if new else f"no new findings{note}")
    return 1 if new else 0

sys.exit(gate_main(sys.argv[1:]))
AUTOSWE_PY

# --- ruff-format (format) ---
t_ruff_format() { ruff format --check --quiet --force-exclude "$@"; }
file_gate ruff-format '(^(.*/)?[^/]*\.py$)|(^(.*/)?[^/]*\.pyi$)' ruff - 0 0 t_ruff_format -

# --- ruff-lint (lint) ---
t_ruff_lint() { ruff check --no-cache --quiet --force-exclude "$@"; }
file_gate ruff-lint '(^(.*/)?[^/]*\.py$)|(^(.*/)?[^/]*\.pyi$)' ruff - 0 0 t_ruff_lint -

# --- eslint (lint) ---
t_eslint() { pnpm -w lint; }
repo_gate eslint pnpm - 0 0 t_eslint -

# --- tsc (types) ---
t_tsc() { pnpm -w typecheck; }
repo_gate tsc pnpm - 0 0 t_tsc -

# --- bandit (security) ---
t_bandit() { printf '%s\0' "$@" | matcher bandit bandit .autoswe/baselines/bandit.json batch -- bandit -q -f json -ll -ii @TARGETS@; }
file_gate bandit '(^(.*/)?[^/]*\.py$)' bandit - 0 0 t_bandit -

# --- gitleaks (security) ---
t_gitleaks() { printf '%s\0' "$@" | matcher gitleaks gitleaks .gitleaksignore each_root -- gitleaks dir @NOIGNORE@ --no-banner --redact --config .gitleaks.toml --exit-code 0 --report-format json --report-path @REPORT@ @TARGET@; }
t_gitleaks_full() { printf '.\0' | matcher gitleaks gitleaks .gitleaksignore root -- gitleaks dir @NOIGNORE@ --no-banner --redact --config .gitleaks.toml --exit-code 0 --report-format json --report-path @REPORT@ @TARGET@; }
file_gate gitleaks '(^(.*/)?[^/]*$)' gitleaks - 0 0 t_gitleaks t_gitleaks_full

# --- js-test (test) ---
t_js_test() { pnpm -w test; }
repo_gate js-test pnpm - 0 0 t_js_test -

# --- spec-validators (test) ---
t_spec_validators() { bash -c 'bash tools/ci/spec-validators.sh' _ "$@"; }
repo_gate spec-validators python3 - 0 0 t_spec_validators -

if [[ -n "$HOOK" ]]; then
  if ((HOOK_FOUND == 0)); then echo "gates.sh: no tool named $HOOK" >&2; exit 2; fi
  if ((${#failed[@]})); then exit 1; fi
  exit 0
fi
if ((${#failed[@]})); then
  if [[ -n "$GATE_STAMP" ]]; then rm -f "$GATE_STAMP"; fi
  echo "GATES FAILED: ${failed[*]}"
  exit 1
fi
# Only a full run that checked every gate records the tree, and only if the tree didn't change meanwhile.
if [[ -n "$GATE_TREE" && "$SCOPE" != changed && "${FAST:-0}" != 1 && "$(tree_hash)" == "$GATE_TREE" ]]; then
  mkdir -p "$(dirname "$GATE_STAMP")" 2>/dev/null && printf '%s %s\n' "$CACHE_KEY" "$GATE_TREE" >"$GATE_STAMP" 2>/dev/null
fi
echo "ALL GATES PASSED"

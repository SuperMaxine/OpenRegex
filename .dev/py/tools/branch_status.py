import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEV_DIR = SCRIPT_DIR.parent.parent
PY_DIR = SCRIPT_DIR.parent
UTILS_DIR = PY_DIR / "utils"

sys.path.insert(0, str(DEV_DIR))
sys.path.insert(0, str(UTILS_DIR))

from logger import ConsoleLogger


def get_root_dir() -> Path:
    return SCRIPT_DIR.parent.parent.parent


def run_git(args: list[str], cwd: Path) -> str:
    try:
        result = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return ""


def get_base_branch(root: Path, current_branch: str) -> str:
    candidates = ["develop", "main", "master", "origin/develop", "origin/main", "origin/master"]
    for cand in candidates:
        if current_branch == cand or f"origin/{current_branch}" == cand:
            continue
        if run_git(["rev-parse", "--verify", "--quiet", cand], root):
            return cand
    return ""


def get_commits(rev_range: str, cwd: Path, limit: int = 0) -> list[list[str]]:
    args = ["log", "--format=%h|%s"]
    if limit > 0:
        args.extend(["-n", str(limit)])
    args.append(rev_range)

    output = run_git(args, cwd)
    if not output:
        return []

    rows = []
    for line in output.splitlines():
        parts = line.split("|", 1)
        if len(parts) == 2:
            rows.append([parts[0], parts[1]])
    return rows


def main():
    root = get_root_dir()

    branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    if not branch:
        print(ConsoleLogger.error("Not a git repository or no commits yet."))
        return

    upstream = run_git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], root)
    base_branch = get_base_branch(root, branch)
    fork_point = run_git(["merge-base", "HEAD", base_branch], root) if base_branch else ""

    print(f"\n{ConsoleLogger.BOLD}Current Branch: {ConsoleLogger.CYAN}{branch}{ConsoleLogger.RESET}")

    if upstream:
        print(f"{ConsoleLogger.BOLD}Tracking Remote: {ConsoleLogger.CYAN}{upstream}{ConsoleLogger.RESET}\n")

        local_only = get_commits(f"{upstream}..HEAD", root)
        remote_only = get_commits(f"HEAD..{upstream}", root)

        upstream_base = run_git(["merge-base", "HEAD", upstream], root)
        if upstream_base:
            if fork_point:
                shared = get_commits(f"{fork_point}..{upstream_base}", root, limit=15)
            else:
                shared = get_commits(upstream_base, root, limit=15)
        else:
            shared = []
    else:
        print(f"{ConsoleLogger.warning('No remote tracking branch configured.')}\n")
        if fork_point:
            local_only = get_commits(f"{fork_point}..HEAD", root, limit=15)
        else:
            local_only = get_commits("HEAD", root, limit=15)
        remote_only = []
        shared = []

    def format_rows(commits, status_label, color_func):
        return [[c[0], color_func(status_label), c[1]] for c in commits]

    local_rows = format_rows(local_only, "Local Only", ConsoleLogger.success)
    remote_rows = format_rows(remote_only, "Remote Only", ConsoleLogger.error)
    shared_rows = format_rows(shared, "Both (Shared)", ConsoleLogger.info)

    all_rows = local_rows + remote_rows + shared_rows

    if not all_rows:
        print(ConsoleLogger.info("No commits found."))
        return

    ConsoleLogger.print_table(
        "Git Commit Status",
        ["Commit Hash", "Location", "Message"],
        all_rows
    )


if __name__ == "__main__":
    main()
import subprocess
import sys
import re
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


def run_git(args: list[str], cwd: Path) -> list[str]:
    try:
        result = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, check=True)
        return [line.strip() for line in result.stdout.splitlines() if line.strip()]
    except subprocess.CalledProcessError:
        return []


def determine_scope(file_path: str) -> str:
    if file_path.startswith("apps/openregex-backend/"):
        return "backend"
    if file_path.startswith("apps/openregex-frontend/"):
        return "frontend"
    if file_path.startswith("libs/python-shared/"):
        return "shared-lib"
    if file_path.startswith("workers/worker-ai/"):
        return "worker-ai"
    if file_path.startswith("workers/worker-python/"):
        return "worker-python"

    worker_match = re.match(r"^workers/worker-([^/]+)/", file_path)
    if worker_match:
        return f"worker-{worker_match.group(1)}"

    if file_path.startswith(".dev/"):
        return "release"

    return "general"


def main():
    root = get_root_dir()

    # Target latest commit by default, or accept a specific hash via arguments
    commit = sys.argv[1] if len(sys.argv) > 1 else "HEAD"

    print(f"\n{ConsoleLogger.BOLD}Analyzing scopes for commit: {ConsoleLogger.CYAN}{commit}{ConsoleLogger.RESET}\n")

    # Retrieves list of files changed in the specified commit
    files = run_git(["show", "--name-only", "--format=", commit], root)

    if not files:
        print(ConsoleLogger.info("No files changed in this commit or commit not found."))
        return

    rows = []
    for file in files:
        scope = determine_scope(file)
        # Highlight known scopes in green, fallback 'general' scope in yellow
        color_func = ConsoleLogger.success if scope != "general" else ConsoleLogger.warning
        rows.append([color_func(scope), file])

    ConsoleLogger.print_table("Changed Files and Assigned Scopes", ["Scope", "File Path"], rows)


if __name__ == "__main__":
    main()
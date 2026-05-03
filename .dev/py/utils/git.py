import subprocess
from pathlib import Path


def run_git(args: list[str], cwd: Path) -> str:
    """Executes a git command and returns the stripped stdout."""
    try:
        result = subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return ""


def run_git_lines(args: list[str], cwd: Path) -> list[str]:
    """Executes a git command and returns a list of non-empty lines from stdout."""
    output = run_git(args, cwd)
    return [line.strip() for line in output.splitlines() if line.strip()]
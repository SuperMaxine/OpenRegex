import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEV_DIR = SCRIPT_DIR.parent.parent
PY_DIR = SCRIPT_DIR.parent
UTILS_DIR = PY_DIR / "utils"

sys.path.insert(0, str(DEV_DIR))
sys.path.insert(0, str(UTILS_DIR))

from registry import VERSIONS
from logger import ConsoleLogger


def get_root_dir() -> Path:
    return SCRIPT_DIR.parent.parent.parent


def has_unreleased_changes(changelog_path: Path) -> bool:
    if not changelog_path.exists():
        return False

    content = changelog_path.read_text(encoding="utf-8")
    lines = content.splitlines()

    in_unreleased = False
    for line in lines:
        if line.startswith("## [Unreleased]"):
            in_unreleased = True
            continue
        if in_unreleased:
            if line.startswith("## ["):
                break
            if line.strip().startswith("-"):
                return True
    return False


def main():
    root = get_root_dir()
    results = []

    print(f"\n{ConsoleLogger.BOLD}Checking Unreleased Changelogs...{ConsoleLogger.RESET}")

    for project, version in VERSIONS.items():
        changelog_path = root / project / "CHANGELOG.md"

        if version.endswith(".dev"):
            results.append([project, ConsoleLogger.info("Skipped (DEV)")])
            continue

        if not changelog_path.exists():
            results.append([project, ConsoleLogger.warning("Missing CHANGELOG.md")])
            continue

        if has_unreleased_changes(changelog_path):
            results.append([project, ConsoleLogger.error("Unreleased")])
        else:
            results.append([project, ConsoleLogger.success("Up to date")])

    ConsoleLogger.print_table("Unreleased Changelog Status", ["Component", "Status"], results)


if __name__ == "__main__":
    main()
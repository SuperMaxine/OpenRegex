import os
import sys
import json
import argparse
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEV_DIR = SCRIPT_DIR.parent.parent
PY_DIR = SCRIPT_DIR.parent
UTILS_DIR = PY_DIR / "utils"

sys.path.insert(0, str(DEV_DIR))
sys.path.insert(0, str(PY_DIR))
sys.path.insert(0, str(UTILS_DIR))

from registry import VERSIONS
from logger import ConsoleLogger
from git import run_git, run_git_lines
from ai.model import LLMConfig
from ai.llm import LLMClient
from config import DEV_LLM_ENDPOINT, DEV_LLM_MODEL, DEV_LLM_API_KEY, DEV_LLM_SSL_VERIFY

from update_changelog import process_changelog_entries


def get_root_dir() -> Path:
    return SCRIPT_DIR.parent.parent.parent


def determine_scope(file_path: str) -> str:
    if file_path.startswith("apps/openregex-backend/"): return "backend"
    if file_path.startswith("apps/openregex-frontend/"): return "frontend"
    if file_path.startswith("libs/python-shared/"): return "shared-lib"
    if file_path.startswith("workers/worker-ai/"): return "worker-ai"
    if file_path.startswith("workers/worker-python/"): return "worker-python"

    worker_match = re.match(r"^workers/worker-([^/]+)/", file_path)
    if worker_match:
        return f"worker-{worker_match.group(1)}"

    if file_path.startswith(".dev/"): return "release"
    return "general"


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


def generate_system_prompt() -> str:
    return """You are an expert developer managing an OpenRegex monorepo.
Your task is to rewrite user input and git diffs into a strict Conventional Commit message.

RULES:
1. Format: `<type>(<scope>): <description>` followed by optional body and footers.
2. Allowed Types: feat, fix, refactor, perf, docs, chore.
   * CRITICAL: Changes to `.dev/` scripts or tools MUST be of type `chore`.
   * CRITICAL FILE EXTENSION RULE: If the affected files include source code (e.g., .py, .cpp, .js, .rs), the commit type MUST NOT be `docs`, even if the changes only update comments, docstrings, or embedded cheat sheets. Reserve `docs` strictly for dedicated documentation files (e.g., .md files).
3. Allowed Scopes: You must strictly use the scopes provided to you in the "Detected Scopes" context.
4. Multi-component changes: If multiple scopes are affected, you MUST generate a separate `<type>(<scope>): <subject>` header for EACH scope in the `commit_message` string, separated by blank lines.
   * CRITICAL: DO NOT group multiple scopes under a single fallback header like `chore(general)`. Each affected scope must have its own distinct commit header and body within the final string.
5. Breaking changes: Add '!' after the scope and a 'BREAKING CHANGE:' footer.

You must return a raw JSON object (without markdown code blocks) matching this schema:
{
  "commit_message": "The full formatted commit message string",
  "affected_components": ["release"],
  "changelog_entries": [
    {
      "scope": "component-scope",
      "type": "Added|Fixed|Changed",
      "message": "Description of the change"
    }
  ]
}

Note for Changelog: Map 'feat'->'Added', 'fix'->'Fixed', 'refactor'/'perf'->'Changed'.
CRITICAL CHANGELOG RULE: Omit `docs` and `chore` completely. If the commit type is `chore` or `docs`, `changelog_entries` MUST be an empty list [].
"""


def main():
    parser = argparse.ArgumentParser(description="AI-Assisted Commit Tool")
    parser.add_argument("-m", "--message", type=str, help="Rough draft of the commit message", default="")
    parser.add_argument("--amend", action="store_true", help="Improve and amend the latest commit")
    parser.add_argument("--squash-interactive", action="store_true", help="Interactive squash mode")
    args = parser.parse_args()

    root = get_root_dir()
    branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"], root)

    if not branch:
        print(ConsoleLogger.error("Not a git repository."))
        return

    print(f"\n{ConsoleLogger.BOLD}Analyzing Git State on branch: {ConsoleLogger.CYAN}{branch}{ConsoleLogger.RESET}")

    target_commits = []
    squash_count = 0
    requires_force_push = False

    if args.squash_interactive:
        upstream = run_git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], root)
        base_branch = get_base_branch(root, branch)
        fork_point = run_git(["merge-base", "HEAD", base_branch], root) if base_branch else ""

        if upstream:
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
            if fork_point:
                local_only = get_commits(f"{fork_point}..HEAD", root, limit=15)
            else:
                local_only = get_commits("HEAD", root, limit=15)
            remote_only = []
            shared = []

        def format_rows(commits, status_label, color_func):
            return [[c[0], color_func(status_label), c[1]] for c in commits]

        all_rows = (
                format_rows(local_only, "Local Only", ConsoleLogger.success) +
                format_rows(remote_only, "Remote Only", ConsoleLogger.error) +
                format_rows(shared, "Both (Shared)", ConsoleLogger.info)
        )

        if not all_rows:
            print(ConsoleLogger.info("\nNo commits found on this branch."))
            return

        enumerated_rows = [[str(i + 1)] + row for i, row in enumerate(all_rows)]
        ConsoleLogger.print_table("Git Commit Status", ["#", "Commit Hash", "Location", "Message"], enumerated_rows)

        max_commits = len(local_only) + len(remote_only) + len(shared)
        if max_commits == 0:
            print(ConsoleLogger.info("\nNo commits available to squash."))
            return

        while True:
            prompt = f"{ConsoleLogger.BOLD}{ConsoleLogger.YELLOW}How many commits would you like to squash? [{ConsoleLogger.CYAN}1-{max_commits}{ConsoleLogger.YELLOW}]: {ConsoleLogger.RESET}"
            try:
                choice = input(prompt).strip()
                squash_count = int(choice)
                if 1 <= squash_count <= max_commits:
                    if squash_count > len(local_only):
                        print(ConsoleLogger.warning(
                            f"\n[WARNING] You selected {squash_count} commits, which includes commits already pushed to remote."))
                        print(ConsoleLogger.warning(
                            "A 'git push --force' will be executed automatically after the squash is complete."))
                        requires_force_push = True
                    break
                print(ConsoleLogger.error(f"Please enter a number between 1 and {max_commits}."))
            except ValueError:
                print(ConsoleLogger.error("Invalid input. Please enter a number."))

        target_commits = run_git_lines(["log", f"-n{squash_count}", "--format=%h"], root)

    elif args.amend:
        target_commits = ["HEAD"]
    else:
        print(ConsoleLogger.error("Please specify --amend or --squash-interactive"))
        return

    affected_files = set()
    git_logs = []

    for commit in target_commits:
        files = run_git_lines(["show", "--name-only", "--format=", commit], root)
        affected_files.update(f for f in files if not f.endswith("CHANGELOG.md"))

        msg = run_git(["show", "-s", "--format=%s%n%b", commit], root)
        git_logs.append(f"Commit {commit}:\n{msg}")

    if not affected_files:
        print(ConsoleLogger.info("No non-changelog files found in target commits. Skipping AI generation."))
        return

    file_rows = []
    detected_scopes = set()
    for f in affected_files:
        scope = determine_scope(f)
        detected_scopes.add(scope)
        color = ConsoleLogger.success if scope != "general" else ConsoleLogger.warning
        file_rows.append([color(scope), f])

    ConsoleLogger.print_table("Files Included in Target Commits", ["Scope", "File Path"], file_rows)

    print(f"\n{ConsoleLogger.BOLD}Generating AI Commit Message...{ConsoleLogger.RESET}")
    config = LLMConfig(
        model_name=DEV_LLM_MODEL,
        api_key=DEV_LLM_API_KEY,
        api_base=DEV_LLM_ENDPOINT,
        verify_ssl=DEV_LLM_SSL_VERIFY
    )
    client = LLMClient(config)

    user_context = f"User Draft Note: {args.message}\n" if args.message else "User Draft Note: None\n"

    diff_context = (
            f"Detected Scopes (USE THESE STRICTLY): {', '.join(detected_scopes)}\n\n"
            f"Historical Commit Messages:\n" + "\n".join(git_logs) +
            f"\n\nAffected Files:\n{', '.join(affected_files)}"
    )

    try:
        response = client.chat([
            {"role": "system", "content": generate_system_prompt()},
            {"role": "user", "content": user_context + diff_context}
        ], options={"response_format": {"type": "json_object"}}, enable_thinking=False)

        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]

        data = json.loads(content)
        commit_msg = data.get("commit_message", "chore(general): fallback commit")
        changelog_entries = data.get("changelog_entries", [])

    except Exception as e:
        print(ConsoleLogger.error(f"Failed to generate AI commit: {e}"))
        return

    print(f"\n{ConsoleLogger.BOLD}{ConsoleLogger.MAGENTA}=== Proposed Commit Message ==={ConsoleLogger.RESET}")
    print(f"{ConsoleLogger.CYAN}{commit_msg}{ConsoleLogger.RESET}\n")

    if changelog_entries:
        print(f"{ConsoleLogger.BOLD}Changelog Updates Planned:{ConsoleLogger.RESET}")
        for entry in changelog_entries:
            if isinstance(entry, dict):
                print(
                    f" - [{entry.get('scope', 'unknown')}] {entry.get('type', 'unknown')}: {entry.get('message', '')}")
            else:
                print(f" - {entry}")

    prompt = f"\n{ConsoleLogger.BOLD}{ConsoleLogger.YELLOW}Proceed with this commit update? [y/N]: {ConsoleLogger.RESET}"
    choice = input(prompt).strip().lower()

    if choice in ['y', 'yes']:
        modified_changelogs = []
        if changelog_entries:
            modified_changelogs = process_changelog_entries(root, changelog_entries)

        if modified_changelogs:
            run_git(["add"] + modified_changelogs, root)
            print(ConsoleLogger.success(f"Staged {len(modified_changelogs)} changelog file(s) for atomic commit."))

        if args.amend:
            run_git(["commit", "--amend", "-m", commit_msg], root)
            print(ConsoleLogger.success("\n[OK] Commit amended successfully."))
        elif args.squash_interactive:
            run_git(["reset", "--soft", f"HEAD~{squash_count}"], root)
            run_git(["commit", "-m", commit_msg], root)
            print(ConsoleLogger.success(f"\n[OK] Squashed {squash_count} commits successfully."))

            if requires_force_push:
                print(ConsoleLogger.info("Pushing changes to remote (--force)..."))
                run_git(["push", "--force"], root)
                print(ConsoleLogger.success("[OK] Remote branch force updated."))
    else:
        print(ConsoleLogger.info("Operation aborted by user."))


if __name__ == "__main__":
    main()
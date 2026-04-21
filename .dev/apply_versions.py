import os
import re
import sys
from pathlib import Path

# Add directory to sys.path to ensure registry can be imported directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from registry import VERSIONS


def get_root_dir() -> Path:
    return Path(__file__).resolve().parent.parent


def update_file(file_path: Path, pattern: str, replacement: str):
    if not file_path.exists():
        print(f"[SKIP] {file_path.relative_to(get_root_dir())} (File not found)")
        return

    content = file_path.read_text(encoding="utf-8")
    new_content, count = re.subn(pattern, replacement, content, count=1, flags=re.MULTILINE)

    if count > 0:
        if new_content != content:
            file_path.write_text(new_content, encoding="utf-8")
            print(f"[OK] Updated {file_path.relative_to(get_root_dir())}")
        else:
            print(f"[OK] {file_path.relative_to(get_root_dir())} is already up to date.")
    else:
        print(f"[WARN] Version pattern not found in {file_path.relative_to(get_root_dir())}")


def main():
    root = get_root_dir()

    # Map projects to lists of their configuration files and regex patterns
    update_targets = {
        # --- APPS & LIBS (Updates package manifests + APP_VERSION) ---
        "apps/openregex-backend": [
            ("apps/openregex-backend/pyproject.toml", r'^version\s*=\s*"[^"]+"', 'version = "{}"'),
            ("deploy/dockerfiles/openregex-backend.dockerfile", r'^ENV APP_VERSION="[^"]+"', 'ENV APP_VERSION="{}"')
        ],
        "apps/openregex-frontend": [
            ("apps/openregex-frontend/package.json", r'"version"\s*:\s*"[^"]+"', '"version": "{}"'),
            ("deploy/dockerfiles/openregex-frontend.dockerfile", r'^ENV VITE_APP_VERSION="[^"]+"', 'ENV VITE_APP_VERSION="{}"')
        ],
        "libs/python-shared": [
            ("libs/python-shared/pyproject.toml", r'^version\s*=\s*"[^"]+"', 'version = "{}"')
        ],

        # --- WORKERS (Strictly updates WORKER_VERSION in Dockerfile only) ---
        "workers/worker-python": [
            ("deploy/dockerfiles/worker-python.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ],
        "workers/worker-c-cpp": [
            ("deploy/dockerfiles/worker-c-cpp.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ],
        "workers/worker-v8": [
            ("deploy/dockerfiles/worker-v8.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ],
        "workers/worker-rust": [
            ("deploy/dockerfiles/worker-rust.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ],
        "workers/worker-dotnet": [
            ("deploy/dockerfiles/worker-dotnet.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ],
        "workers/worker-jvm": [
            ("deploy/dockerfiles/worker-jvm.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ],
        "workers/worker-go": [
            ("deploy/dockerfiles/worker-go.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ],
        "workers/worker-php": [
            ("deploy/dockerfiles/worker-php.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ],
        "workes/worker-ai": [
            ("deploy/dockerfiles/worker-ai.dockerfile", r'^ENV WORKER_VERSION="[^"]+"', 'ENV WORKER_VERSION="{}"')
        ]
    }

    for project, target_version in VERSIONS.items():
        if project in update_targets:
            for filepath, pattern, replacement_template in update_targets[project]:
                file_path = root / filepath
                write_version = target_version

                # Python's PEP 440 strictly requires local version labels to use '+' instead of '-'
                if file_path.name == "pyproject.toml" and "-" in write_version:
                    write_version = write_version.replace("-", "+", 1)

                replacement = replacement_template.format(write_version)
                update_file(file_path, pattern, replacement)
        else:
            print(f"[SKIP] {project} (No automated version target configured)")

    print("\nVersion synchronization complete.")


if __name__ == "__main__":
    main()
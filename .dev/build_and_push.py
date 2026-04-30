#!/usr/bin/env python3
import os
import re
import subprocess
import sys
import datetime
from registry import VERSIONS

DOCKER_USERNAME = os.environ.get("DOCKER_USERNAME", "sunnev")


def get_version_from_dockerfile(dockerfile_path, var_name):
    """Extracts the specific version variable (APP, VITE_APP, or ENGINE) from the Dockerfile."""
    if not os.path.exists(dockerfile_path):
        return None

    with open(dockerfile_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Matches ENV VAR_NAME="version"
    pattern = rf'^ENV {var_name}="([^"]+)"'
    match = re.search(pattern, content, re.MULTILINE)

    return match.group(1) if match else None


def run_command(cmd, cwd, env=None):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env)
    if result.returncode != 0:
        print(f"[ERROR] Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)


def main():
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    current_date = datetime.datetime.now().strftime("%Y-%m-%d")

    print(f"Starting build and push process for Docker Hub user: {DOCKER_USERNAME}\n")

    for component_path, registry_version in VERSIONS.items():
        # Skip shared libraries
        if component_path.startswith("libs/"):
            continue

        component_name = os.path.basename(component_path)
        dockerfile_path = os.path.join("deploy", "dockerfiles", f"{component_name}.dockerfile")
        full_dockerfile_path = os.path.join(project_root, dockerfile_path)

        if not os.path.exists(full_dockerfile_path):
            print(f"[SKIP] No dockerfile found for {component_name} at {dockerfile_path}")
            continue

        # --- Dynamic Variable Mapping ---
        # 1. Determine which ENV var to check and which Build Arg to pass
        if "frontend" in component_name:
            var_name = "VITE_APP_VERSION"
            date_arg_name = "VITE_APP_RELEASE_DATE"
        elif "backend" in component_name:
            var_name = "APP_VERSION"
            date_arg_name = "APP_RELEASE_DATE"
        else:
            # Standard for all workers
            var_name = "WORKER_VERSION"
            date_arg_name = "WORKER_RELEASE_DATE"

        # 2. Extract version from Dockerfile to verify it matches the registry
        dockerfile_version = get_version_from_dockerfile(full_dockerfile_path, var_name)

        if dockerfile_version is None:
            print(f"[SKIP] {component_name}: Could not find {var_name} in Dockerfile.")
            continue

        if dockerfile_version != registry_version:
            print(
                f"[SKIP] {component_name}: Dockerfile ({dockerfile_version}) mismatch with "
                f"Registry ({registry_version}). Run 'apply_versions.py' first."
            )
            # continue


        # --- Image Naming Logic ---
        if not component_name.startswith("openregex-"):
            image_repo_name = f"openregex-{component_name}"
        else:
            image_repo_name = component_name

        image_name = f"{DOCKER_USERNAME}/{image_repo_name}"
        version_tag = f"{image_name}:{registry_version}"
        latest_tag = f"{image_name}:latest"

        print(f"\n[BUILD] {image_repo_name} (Version: {registry_version})")

        # 3. Execute Docker Build with the specific release date argument
        build_cmd = [
            "docker", "build",
            "-f", dockerfile_path,
            "-t", version_tag,
            "-t", latest_tag,
            "--build-arg", f"{date_arg_name}={current_date}",
            "."
        ]
        run_command(build_cmd, cwd=project_root)

        print(f"[PUSH] Pushing {image_repo_name}...")
        run_command(["docker", "push", version_tag], cwd=project_root)
        run_command(["docker", "push", latest_tag], cwd=project_root)


if __name__ == "__main__":
    main()
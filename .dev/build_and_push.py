#!/usr/bin/env python3
import os
import re
import subprocess
import sys
import datetime
import argparse
from registry import VERSIONS

DOCKER_USERNAME = os.environ.get("DOCKER_USERNAME", "sunnev")

COMPONENT_NAMES = {
    "apps/openregex-frontend": "**OpenRegex Frontend**",
    "apps/openregex-backend": "**OpenRegex Backend**",
    "libs/python-shared": "**Python Shared Library**",
    "workers/worker-ai": "**Worker AI**",
    "workers/worker-python": "**Worker Python**",
    "workers/worker-c-cpp": "**Worker C/C++**",
    "workers/worker-dotnet": "**Worker .NET**",
    "workers/worker-go": "**Worker Go**",
    "workers/worker-jvm": "**Worker JVM**",
    "workers/worker-rust": "**Worker Rust**",
    "workers/worker-v8": "**Worker V8**",
    "workers/worker-php": "**Worker PHP**",
}


def tag_exists_on_remote(image_name, tag):
    """Checks if the specific tag exists on Docker Hub using manifest inspect."""
    full_image = f"{image_name}:{tag}"
    cmd = ["docker", "manifest", "inspect", full_image]
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0


def get_version_from_dockerfile(dockerfile_path, var_name):
    """Extracts the specific version variable from the Dockerfile."""
    if not os.path.exists(dockerfile_path):
        return None

    with open(dockerfile_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = rf'^ENV {var_name}="([^"]+)"'
    match = re.search(pattern, content, re.MULTILINE)

    return match.group(1) if match else None


def run_command(cmd, cwd, env=None):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env)
    if result.returncode != 0:
        print(f"[ERROR] Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)


def parse_changelog(changelog_path):
    if not os.path.exists(changelog_path):
        return [], -1, -1, {}

    with open(changelog_path, 'r', encoding="utf-8") as f:
        lines = f.read().splitlines()

    table_start = -1
    table_end = -1
    in_table = False

    for i, line in enumerate(lines):
        if line.startswith("| Component"):
            in_table = True
            table_start = i
        if in_table:
            if not line.strip().startswith("|"):
                table_end = i
                break

    if in_table and table_end == -1:
        table_end = len(lines)

    state = {}
    if table_start != -1:
        headers = [h.strip() for h in lines[table_start].split("|")][1:-1]
        has_changelog = "Changelog" in headers

        o_idx = 2 if has_changelog else 1
        r_idx = 3 if has_changelog else 2
        d_idx = 4 if has_changelog else 3
        dr_idx = 5 if has_changelog else 4

        for line in lines[table_start:table_end]:
            if "---" in line or "Component" in line:
                continue
            parts = [p.strip() for p in line.split("|")][1:-1]
            if not parts:
                continue

            comp = parts[0]
            state[comp] = {
                "Official Version": parts[o_idx] if len(parts) > o_idx else "N/A",
                "release date": parts[r_idx] if len(parts) > r_idx else "N/A",
                "Develop Version": parts[d_idx] if len(parts) > d_idx else "N/A",
                "dev release date": parts[dr_idx] if len(parts) > dr_idx else "N/A"
            }

        family_key = "**Worker Family (All)**"
        if family_key in state:
            family_state = state.pop(family_key)
            for path in VERSIONS.keys():
                if path.startswith("workers/"):
                    c_name = COMPONENT_NAMES.get(path)
                    if c_name and c_name not in state:
                        state[c_name] = family_state.copy()

    return lines, table_start, table_end, state


def write_changelog(changelog_path, lines, table_start, table_end, state, update_date_dash):
    new_table = [
        "| Component | Changelog | Official Version | release date | Develop Version | dev release date |",
        "|:---|:---|:---|---|---|---|"
    ]

    for comp_path in COMPONENT_NAMES.keys():
        comp_name = COMPONENT_NAMES[comp_path]
        if comp_name in state:
            s = state[comp_name]
            changelog_link = f"[View](./{comp_path}/CHANGELOG.md)"
            new_table.append(
                f"| {comp_name} | {changelog_link} | {s['Official Version']} | {s['release date']} | {s['Develop Version']} | {s['dev release date']} |"
            )

    lines[table_start:table_end] = new_table

    for i, line in enumerate(lines):
        if line.startswith("**Last Update:"):
            lines[i] = f"**Last Update: {update_date_dash}**"
            break

    with open(changelog_path, 'w', encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def update_state_for_component(state, comp_name, registry_version, is_dev, date_dot, force_update=False):
    """Updates the changelog state. If force_update is True, it bumps the date even if the version didn't change."""
    if comp_name not in state:
        state[comp_name] = {
            "Official Version": "N/A",
            "release date": "N/A",
            "Develop Version": "N/A",
            "dev release date": "N/A"
        }

    formatted_ver = f"`{registry_version}`"
    updated = False

    if is_dev:
        if state[comp_name]["Develop Version"] != formatted_ver or force_update:
            state[comp_name]["Develop Version"] = formatted_ver
            state[comp_name]["dev release date"] = date_dot
            updated = True
    else:
        if state[comp_name]["Official Version"] != formatted_ver or force_update:
            state[comp_name]["Official Version"] = formatted_ver
            state[comp_name]["release date"] = date_dot
            updated = True

    return updated


def main():
    # --- Setup Command Line Arguments ---
    parser = argparse.ArgumentParser(description="Build and push Docker images for OpenRegex.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force build and push, ignoring the remote Docker Hub tag existence check."
    )
    parser.add_argument(
        "--fake-push",
        action="store_true",
        help="Skip the actual docker push command, but still run the build."
    )
    parser.add_argument(
        "--force-changelog",
        action="store_true",
        help="Force the release date in the changelog to update to today, even if the version is unchanged."
    )
    args = parser.parse_args()

    force_mode = args.force
    fake_push_mode = args.fake_push
    force_changelog_mode = args.force_changelog

    # If --force is used, we also force the changelog date to bump to reflect the forced build.
    force_date_bump = force_mode or force_changelog_mode

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    changelog_path = os.path.join(project_root, "CHANGELOG.md")

    now = datetime.datetime.now()
    current_date_dash = now.strftime("%Y-%m-%d")
    current_date_dot = now.strftime("%Y.%m.%d")

    print(f"Starting build and push process for Docker Hub user: {DOCKER_USERNAME}")
    if force_mode:
        print("[WARNING] Running in FORCE mode. Remote tag checks bypassed.")
    if fake_push_mode:
        print("[WARNING] Running in FAKE PUSH mode. Docker push commands skipped.")
    if force_changelog_mode:
        print("[WARNING] Running in FORCE CHANGELOG mode. Release dates will be updated regardless of version changes.")
    print("\n")

    lines, table_start, table_end, state = parse_changelog(changelog_path)
    if table_start == -1:
        print("[WARN] Could not find the Component Version Snapshot table in CHANGELOG.md")

    changelog_updated = False

    for component_path, registry_version in VERSIONS.items():
        component_name = os.path.basename(component_path)
        pretty_name = COMPONENT_NAMES.get(component_path)
        is_dev = ".dev" in registry_version

        # Shared libraries (No docker build, but update changelog if changed)
        if component_path.startswith("libs/"):
            if pretty_name and update_state_for_component(state, pretty_name, registry_version, is_dev,
                                                          current_date_dot, force_update=force_date_bump):
                print(f"[CHANGELOG] Updated state for {component_name}")
                changelog_updated = True
            continue

        dockerfile_path = os.path.join("deploy", "dockerfiles", f"{component_name}.dockerfile")
        full_dockerfile_path = os.path.join(project_root, dockerfile_path)

        if not os.path.exists(full_dockerfile_path):
            print(f"[SKIP] No dockerfile found for {component_name} at {dockerfile_path}")
            continue

        # --- Dynamic Variable Mapping ---
        if "frontend" in component_name:
            var_name = "VITE_APP_VERSION"
            date_arg_name = "VITE_APP_RELEASE_DATE"
        elif "backend" in component_name:
            var_name = "APP_VERSION"
            date_arg_name = "APP_RELEASE_DATE"
        else:
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
            continue

        # --- Image Naming Logic ---
        if not component_name.startswith("openregex-"):
            image_repo_name = f"openregex-{component_name}"
        else:
            image_repo_name = component_name

        image_name = f"{DOCKER_USERNAME}/{image_repo_name}"
        version_tag = f"{image_name}:{registry_version}"
        latest_tag = f"{image_name}:latest"

        # --- Check if Image already exists on Docker Hub (Unless forced) ---
        if not force_mode:
            print(f"\n[CHECKING] Validating if {version_tag} exists on Docker Hub...")
            if tag_exists_on_remote(image_name, registry_version):
                print(f"[SKIP] Build and push bypassed. '{version_tag}' already exists remotely.")

                # Update changelog if version is genuinely new OR if we explicitly forced the changelog
                if pretty_name and update_state_for_component(state, pretty_name, registry_version, is_dev,
                                                              current_date_dot, force_update=force_changelog_mode):
                    print(f"[CHANGELOG] Updated state for {component_name} (Forced or new).")
                    changelog_updated = True
                continue
        else:
            print(f"\n[FORCE] Ignoring remote check for {version_tag}...")

        print(f"[BUILD] Proceeding with build for {image_repo_name} (Version: {registry_version})")

        # 3. Execute Docker Build with the specific release date argument
        build_cmd = [
            "docker", "build",
            "-f", dockerfile_path,
            "-t", version_tag,
            "--build-arg", f"{date_arg_name}={current_date_dash}",
            "."
        ]

        if not is_dev:
            build_cmd.extend(["-t", latest_tag])

        run_command(build_cmd, cwd=project_root)

        # --- Push Logic (Respecting Fake Push Flag) ---
        if not fake_push_mode:
            print(f"[PUSH] Pushing {image_repo_name}...")
            run_command(["docker", "push", version_tag], cwd=project_root)

            if not is_dev:
                run_command(["docker", "push", latest_tag], cwd=project_root)
            else:
                print(f"[SKIP] Skipping 'latest' tag push for develop version ({registry_version}).")
        else:
            print(f"[FAKE PUSH] Skipped docker push for {image_repo_name}.")

        # Update changelog tracking state after successful build/(fake)push
        if pretty_name and update_state_for_component(state, pretty_name, registry_version, is_dev, current_date_dot,
                                                      force_update=force_date_bump):
            changelog_updated = True

    if changelog_updated and table_start != -1:
        write_changelog(changelog_path, lines, table_start, table_end, state, current_date_dash)
        print("\n[OK] CHANGELOG.md version snapshot updated successfully.")
    else:
        print("\n[OK] No changes required in CHANGELOG.md.")


if __name__ == "__main__":
    main()
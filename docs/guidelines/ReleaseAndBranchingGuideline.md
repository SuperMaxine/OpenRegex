# OpenRegex Monorepo: Release & Branching Guidelines

This document outlines the standard procedures for managing versions, releasing components, and handling git branches
within the OpenRegex monorepo.

---

## 1. Release Strategy: Independent Versioning

OpenRegex uses an **Independent Versioning** model. Each component (apps, workers, and libs) has its own version cycle
defined in the central registry.

### The Source of Truth: `registry.py`

All versions are managed in `.dev/registry.py`. This file acts as the single source of truth for the entire
ecosystem.

### Automated Changelog & Manifest Synchronization

The project uses a two-step script process to ensure all manifests and the central `CHANGELOG.md` stay in sync:

1. **Version Propagation (`apply_versions.py`):** Updates `pyproject.toml`, `package.json`, and Dockerfiles based on the
   registry.
2. **Changelog & Build (`build_and_push.py`):**
    * It parses the "Component Version Snapshot" table in the root `CHANGELOG.md`.
    * It updates the "Official Version" and "Release Date" columns automatically based on successful builds.
    * It updates the "Last Update" timestamp at the top of the platform log.

---

## 2. Automatic Commit System

To ensure that version bumps and changelog updates are never lost, the following automated commit flow should be used (
currently manual, moving to CI/CD):

### Local Automation Sequence

After updating `.dev/registry.py`, run this command sequence to synchronize and commit all changes:

```bash
# 1. Sync all version manifests
python .dev/apply_versions.py

# 2. Build images and update CHANGELOG.md table
python .dev/build_and_push.py


```

---

## 3. Branching Strategy

To maintain code quality and stability, we follow a feature-branch workflow.

### Branch Types

| Branch Prefix | Purpose                                            | Example                      |
|:--------------|:---------------------------------------------------|:-----------------------------|
| `main`        | Production-ready code. Only updated via releases.  | `main`                       |
| `develop`     | Integration branch for the next release.           | `develop`                    |
| `feature/`    | New functionality or engine support.               | `feature/worker-zig-support` |
| `fix/`        | Bug fixes and ReDoS security patches.              | `fix/v8-memory-leak`         |
| `chore/`      | Maintenance, dependency updates, or documentation. | `chore/update-readme`        |

---

## 4. Future Automation (CI/CD)

**Note:** The current manual execution of scripts is a transitional phase.

---

## 5. Tagging Convention

For monorepo clarity, use prefixed tags:
``
* Format: `<folder>/<component-name>@<version>`
* Example: `workers/worker-php@1.0.1`


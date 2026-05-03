# Commit Message Guidelines: OpenRegex

To ensure automated versioning, clear history, and reliable changelog generation, all commits to the OpenRegex
repository must follow the **Conventional Commits** specification.

## 1. Commit Message Format

Each commit message consists of a **header**, a **body**, and a **footer**. The header has a special format that
includes a **type**, a **scope**, and a **subject**:

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

---

## 2. Types

The type must be one of the following:

| Type           | Purpose                                                    | Automatic Changelog Impact      |
|:---------------|:-----------------------------------------------------------|:--------------------------------|
| **`feat`**     | A new feature for a specific engine or UI component.       | Added to **"Added"** section.   |
| **`fix`**      | A bug fix (e.g., ReDoS patch, memory limit fix).           | Added to **"Fixed"** section.   |
| **`refactor`** | A code change that neither fixes a bug nor adds a feature. | Added to **"Changed"** section. |
| **`perf`**     | A code change that improves performance (e.g., regex JIT). | Added to **"Changed"** section. |
| **`docs`**     | Documentation changes only (README, architecture MDs).     | Ignored in release logs.        |
| **`chore`**    | Maintenance, updating `.dev/` scripts, or dependencies.    | Ignored in release logs.        |

---

## 3. Scopes

The **scope** is critical in our monorepo. It must match the component directory or its logical name.

| Scope               | Component Path                               |
|:--------------------|:---------------------------------------------|
| **`general`**       | Root files, cross-component changes, locales |
| **`backend`**       | `apps/openregex-backend`                     |
| **`frontend`**      | `apps/openregex-frontend`                    |
| **`shared-lib`**    | `libs/python-shared`                         |
| **`worker-ai`**     | `workers/worker-ai`                          |
| **`worker-python`** | `workers/worker-python`                      |
| **`worker-<lang>`** | Any other worker (python, c-cpp, rust, etc.) |
| **`release`**       | Global platform updates or `.dev/` scripts.  |

---

## 4. Examples

### Standard Commit (Single Component)
Ideally, each commit should relate to a single component.

```text
feat(worker-php): add PCRE2 JIT support for improved performance

This update enables Just-In-Time compilation for the PHP engine, 
reducing execution time for complex patterns.
```

### Multi-Component Changes (Combined for Automation)
If a change affects multiple components simultaneously (and needs to be tracked in the automated changelogs for each), you must include the headers for both components within the same commit message body:

```text
feat(backend)!: change Redis task payload format
- Updated the JSON schema for Redis queuing
- Dropped legacy parameters

feat(frontend)!: update task parsing logic
- Adapted React UI to match the new Redis payload
- Fixed loading spinner during task execution
```
*(Note: Your automated script will parse this single commit message and route the specific changes to the backend and frontend changelogs respectively.)*

### Global Documentation or Localization

```text
docs(general): add Spanish translation to the root README

Added a new README.es.md file to the project root and updated the 
language switcher links.
```

---

## 5. Automatic Changelog Integration

When you use these scopes, the automation system performs the following:

1. **Local Log:** Commits with `feat(worker-php)` are automatically appended to `./workers/worker-php/CHANGELOG.md`. Multi-component commits containing multiple scopes will be parsed and routed to their respective component logs.
2. **Global Log:** The `build_and_push.py` script identifies changes in specific scopes and updates the **Component Version Snapshot** table in the root `CHANGELOG.md`.
3. **Versioning:** A commit starting with `feat` will suggest a **Minor** version bump, while `fix` will suggest a **Patch** bump in `registry.py`.

> **Breaking Changes:** If a commit contains a breaking change, add a `!` after the type/scope (e.g.,
`feat(backend)!: change Redis task payload format`) and a `BREAKING CHANGE:` footer. This will trigger a **Major** version bump.

---

### Pro-Tip for Developers

Before committing, always ensure your code is synchronized with the latest registry state:

```bash
python .dev/apply_versions.py  # Synchronize manifests
# Then commit your changes using the guidelines above.
```
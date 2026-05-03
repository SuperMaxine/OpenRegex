# OpenRegex Platform Changelog

This is the central orchestration log for the OpenRegex ecosystem. Detailed technical logs for individual components are
maintained within their respective directories:

---

## Platform Decoupling

**Last Update: 2026-05-03**

### Component Version Snapshot

| Component | Changelog | Official Version | release date | Develop Version | dev release date |
|:---|:---|:---|---|---|---|
| **OpenRegex Frontend** | [View](./apps/openregex-frontend/CHANGELOG.md) | `2.0.0.beta` | 2026.05.01 | `2.0.0.dev` | 2026.05.01 |
| **OpenRegex Backend** | [View](./apps/openregex-backend/CHANGELOG.md) | `2.0.0` | 2026.05.01 | N/A | N/A |
| **Python Shared Library** | [View](./libs/python-shared/CHANGELOG.md) | `1.0.0` | 2026.05.01 | N/A | N/A |
| **Worker AI** | [View](./workers/worker-ai/CHANGELOG.md) | `1.1.0` | 2026.05.03 | N/A | N/A |
| **Worker Python** | [View](./workers/worker-python/CHANGELOG.md) | `1.0.0` | 2026.05.01 | N/A | N/A |
| **Worker C/C++** | [View](./workers/worker-c-cpp/CHANGELOG.md) | `1.0.0` | 2026.05.01 | N/A | N/A |
| **Worker .NET** | [View](./workers/worker-dotnet/CHANGELOG.md) | `1.0.0` | 2026.05.01 | N/A | N/A |
| **Worker Go** | [View](./workers/worker-go/CHANGELOG.md) | `1.0.0` | 2026.05.01 | N/A | N/A |
| **Worker JVM** | [View](./workers/worker-jvm/CHANGELOG.md) | `1.0.0` | 2026.05.01 | N/A | N/A |
| **Worker Rust** | [View](./workers/worker-rust/CHANGELOG.md) | `1.0.0` | 2026.05.01 | N/A | N/A |
| **Worker V8** | [View](./workers/worker-v8/CHANGELOG.md) | `1.0.0` | 2026.05.01 | N/A | N/A |
| **Worker PHP** | [View](./workers/worker-php/CHANGELOG.md) | `1.0.1` | 2026.05.02 | N/A | N/A |

## [2.0.0] - 2026-04-30

### Added

- **Microservices Architecture**: Transitioned to UV Workspaces with a FastAPI backend gateway, React + Vite frontend,
  and Redis message broker.
- **Polyglot Micro-Workers**: Native engine execution via completely isolated Docker containers.
- **Expanded Engine Matrix**: Added support for C/C++ (RE2, Boost, Hyperscan, PCRE2, Oniguruma, POSIX), .NET, Go, Rust,
  PHP, and JVM (RE2J).
- **Pattern Inspector**: Advanced React + Vite frontend for dynamic visual match inspection and AST-based group
  highlighting.
- **AI-Powered Assistant (`worker-ai`)**: Optional independent LLM worker for pattern generation, explanation, and query
  optimization.
- **Zero-Trust Guardrails**: Implemented 1000ms SLAs, strict memory limits (e.g., 8MB heap for binary engines), and
  multiprocessing isolation to mitigate ReDoS attacks.
- **Living Docs System**: Dynamic knowledge base featuring context-aware cheat sheets and engine-specific trivia (
  Factograph).
- **Smart Discovery**: Automatic heartbeat registration of worker node capabilities via Redis.
- **Containerized Deployment**: Comprehensive `docker-compose.yml` for unified ecosystem deployment, eliminating host
  machine compiler dependencies.
- Added `NOTICE` file to comply with Apache 2.0 requirements and protect the OpenRegex brand.

### Changed

- **License Change**: Switched from MIT License to **Apache License 2.0**.
- **Execution Model**: Moved from direct host-machine execution to an isolated Runtime-as-a-Service model.
- Project branding updated to **OpenRegex** with new logos and structural design.

### Removed

- Monolithic `app.py` application architecture.
- Manual host installation requirements for Python, OpenJDK, Node.js, and g++/MSYS2.

### Notes

The transition to Apache License 2.0 provides better protection regarding patent rights and clarifies the use of the "
OpenRegex" trademark, while remaining open-source and free for commercial use.

## [1.3.0] - 2025-03-26

### Added

- JavaScript regex engine to webpage using `Node.js`

### Changed

- icons convert from `svg` inkscape to `svg` plain
- update metadata in the `index.html` file.
- small cosmetic update into web ui

### Fixed

- when input regex is empty link will not be generated and copied to the clipboard.

## [1.2.1] - 2025-03-20

### Changed

- A warning will now display if the generated link exceeds 4094 characters. The link will still be copied to the
  clipboard.
- update metadata in the `index.html` file.

## [1.2.0] - 2025-03-16

### Added

- direct links to regexes for easier sharing and integration.
- added logo for the project.

### Changed

- icons updated to make the interface more intuitive.
- make interface more responsive.

## [1.1.0] - 2025-01-21

### Added

- link to official website "https://openregex.com" in web interface
- regex output and highlight connection in web interface
- regex CheatSheet in web interface
- debug information in web interface

### Changed

- reorganize code for `*.js` and `*.css` files
- reorder colors group in web interface
- black theme for web interface

### Fixed

- error in web-browser console for `*.js` files

## [1.0.0] - 2025-01-10

### Added

- Worker and thread setup in Dockerfile for Gunicorn
- `robots.txt` file for web-crawling bots
- Metadata to HTML
- Docker Hub link in web interface

### Changed

- `style.css` for better UI

### Removed

- Python version information on web interface
- Unused include libraries from `CppRegex.cpp`
- `timeout_wrapper()` from `CppRegex.cpp`

## [0.1.0-dev] - 2025-01-07

### Added

- Initial release
- Web-interface
- Python re - Engine
- Python regex - Engine
- Java regex - Engine
- C++ regex - Engine

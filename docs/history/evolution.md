# OpenRegex 2.0 — Platform Rewrite

> This release represents a complete architectural transformation.  
> OpenRegex evolved from a monolithic regex tool into a distributed execution platform.

---

## Key Shifts

| Area         | v1.x                 | v2.0                      |
|--------------|----------------------|---------------------------|
| Architecture | Monolith             | Microservices             |
| Execution    | Local runtime        | Distributed workers       |
| Engines      | Limited              | Polyglot                  |
| Security     | Basic isolation      | Zero-trust guardrails     |
| Deployment   | Single-container app | Multi-container ecosystem |

---

## [2.0.0] - 2026-04-30

### Added

- **Microservices Architecture**: Transitioned to UV Workspaces with a FastAPI backend gateway, React + Vite frontend,
  and Redis message broker.
- **Polyglot Micro-Workers**: Native engine execution via completely isolated Docker containers.
- **Expanded Engine Matrix**: Added support for C/C++, .NET, Go, Rust, PHP, JVM and more.
- **Pattern Inspector**: Advanced frontend for dynamic match inspection and AST visualization.
- **AI-Powered Assistant (`worker-ai`)**: Independent LLM worker for pattern generation and optimization.
- **Zero-Trust Guardrails**: 1000ms SLA, strict memory limits, multiprocessing isolation.
- **Living Docs System**: Context-aware documentation and knowledge base.
- **Smart Discovery**: Automatic worker registration via Redis.
- **Containerized Deployment**: Full Docker-based ecosystem deployment.
- Added `NOTICE` file (Apache 2.0 compliance).

---

### Changed

- **License Change**: MIT → Apache 2.0
- **Execution Model**: Local execution → Runtime-as-a-Service
- Full rebranding to **OpenRegex**

---

### Removed

- Monolithic `app.py`
- Manual runtime installations (Python, Node, Java, etc.)

---

## Notes

This is not a typical major release.  
It is effectively a **new platform built on top of the original idea**.

Version 2.x should be treated as a new architectural baseline.
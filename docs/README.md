# OpenRegex Documentation Library

Welcome to the internal documentation and technical specifications for the OpenRegex platform.

## 📁 Monorepo Structure (UV Workspaces)

```text
OpenRegex/
├── apps/
│   ├── openregex-backend/          # OpenRegex FastAPI Gateway
│   └── openregex-frontend/         # OpenRegex React UI
├── docs/                           # Internal System Architecture Guidelines
│   ├── FrontendArchitecture.md     # UI Boundaries & State Management Rules
│   └── WorkerNodeArchitecture.md   # SLA, Claims-Check, & Queue Constraints
├── libs/
│   └── python-shared/              # Shared Pydantic models
├── workers/
│   ├── worker-ai/                  # Optional AI Assistant for Regex Operations
│   ├── worker-python/              # re, regex (NFA)
│   ├── worker-c-cpp/               # RE2 (DFA), PCRE2, Oniguruma, POSIX, Hyperscan
│   └── worker-*/                   # Other isolated runtimes
└── deploy/
│     └── docker-compose.yml        # Orchestration of the engine fleet for deployment
└── docker-compose.yml              # Example docker compose ready to use images from docker hub
```

---


## 🏗️ Architecture & Internal Design

* **[Worker Node Architecture](architecture/WorkerNodeArchitecture.md)**
  Specifications for persistent engine execution, decoupled Redis queue consumption, bounded 1000ms SLA guardrails, and claim-check payload resolution.

* **[Frontend Architecture](architecture/FrontendArchitecture.md)**
  Guidelines on domain-driven module boundaries, strict dependency routing, and Zustand state management separation.

## 🛠️ Development & Contribution

* **[Release & Branching Guidelines](guidelines/ReleaseAndBranchingGuideline.md)**
  Procedures for independent versioning, automated changelog generation, and feature-branch workflows.

* **[Commit Message Guidelines](guidelines/Commit.md)**
  Instructions for utilizing Conventional Commits to ensure reliable version increments and automated repository history.


## Project Evolution

* **[Evolution](history/evolution.md)**
    

* **[v1.x](history/1.x.md)**
  
  
**1. The Dependency Rule**
* **`app/`** can import from anywhere.
* **`features/`** can import from `core/` and `shared/`.
* **`features/`** MUST NEVER import from other `features/`. (e.g., `pattern-editor` cannot import a helper from `subject-tester`).
* **`core/`** and `shared/` can only import from themselves or external NPM packages.

**2. How to Build a Feature**
* Create a new folder in `src/features/`.
* Keep all components, hooks, types, and utilities specific to that feature inside the folder.
* Create an `index.ts` file at the root of your feature folder.
* Only export the top-level Component(s) needed by `App.tsx` through this `index.ts` file. Treat everything else as private.

**3. State Management (Zustand)**
* Never pass business logic or global state as props.
* If a piece of state is shared between two or more features (like the current regex string or hovered match ID), it belongs in `core/store/`.
* Inside your feature component, use atomic selectors to grab only the state you need (e.g., `const regex = useRegexStore(state => state.regex)`). This prevents unnecessary re-renders.
* If state is only used locally (like a dropdown toggle in the `EnginePanel`), use standard React `useState`.

**4. Shared Resources**
* If a utility function is used by multiple features (like generating colors ), place it in `src/shared/utils/`.
* If a type is used across the entire application (like `EngineInfo`), place it in `src/core/types/`.
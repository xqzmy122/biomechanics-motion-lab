## 0. Code cleanliness and style (critical)

- **Naming conventions:** components — PascalCase; component files — PascalCase; hooks/utilities — camelCase; constants — UPPER_SNAKE_CASE or camelCase for objects; types/interfaces — PascalCase with an ‘I’ prefix where necessary (e.g. `IUser`).
- **One component/hook/type per file** (except for minor related types or re-exports as agreed by the project).
- **No magic values:** move strings and numbers that affect logic into constants or config; translation keys — from a single set of keys.
- **DRY:** move duplicate logic into hooks, utilities or shared components; do not copy blocks of code.
- **Formatting:** follow the project’s Prettier settings (tabs, no semicolons, single quotes, etc.); do not disable the linter/formatter without a clear reason and a comment.
- **Imports:** order as per .prettierrc (third-party → @/ aliases → relative); do not leave unused imports.
- **Comments:** write ‘why’ rather than ‘what’; do not comment on obvious code; include context and an owner in TODOs where necessary.
- **Features**: if a new feature is likely to be developed further in the future—for example, if similar logic needs to be implemented in another component—use abstractions and interfaces to avoid duplicating code.
- **KISS**: make solution as simplier as you can.
- **Aliases**: use aliases instead of relative path
- **Interfaces**: for describing object always ise interface instead of type
- **GitHub**: don't change something in git, you can only check info of repository but can't do changes: push, commit, stash etc. Always ask if trying to do something like that
- **Ternar operators**: dont use sequence of them, maximum 1 ternar operator in case

## 4. State and re-renders (important)

- **Derived values:** anything that can be calculated from props or state should be computed at render time (as a variable), rather than stored in state and updated via `useEffect`.
- **Expensive subtrees:** move heavy markup or calculations into a separate component and wrap it in `memo` so it isn’t recalculated on every parent re-render; at the same time, allow for an early return before this work is done (e.g. via `loading`).
- **State initialisation:** if the initial state value is the result of a heavy function, pass an initialiser function to `useState`: `useState(() => heavyInit())`.

---

## 5. Rendering and JSX (medium priority)

- **Conditions in JSX:** for conditional rendering, use the ternary operator (`condition ? <A /> : null`) rather than `condition && <A />` if the value could be `0` or `NaN`.
- **Static JSX:** move immutable chunks of JSX (including large SVGs) into constants outside the component so they aren’t created on every render.

---

## 6. Extensibility and structure

- Components should be small, with a single area of responsibility; move complex logic into hooks and utilities.
- Keep API types and contracts explicit (TypeScript); avoid unnecessary re-exports via barrel files in hot paths.
- For client-side caching/requests, use the approach chosen for the project (e.g. SWR) with request deduplication.

---

## 7. Errors and edge cases

- **API errors:** handle them explicitly (display a message to the user, provide a fallback UI, redirect on a 401 error); do not swallow errors without logging them.
- **Loading and empty data:** for lists and details, provide loading and empty states; do not display ‘raw’ null/undefined values in the UI.
- **Validation:** validate data from the backend and user input; use types and, where necessary, Zod/Yod for runtime boundary checks.
- **Types:** use types and interfaces for all data passed between components and the server. Do not use `any`.

---

## 8. Security and data

- Do not hardcode tokens and secrets; do not log tokens and personal data.
- Do not insert dangerous content (HTML from the backend, user input) via `dangerouslySetInnerHTML` without sanitisation.
- Confirm sensitive actions (password change, deletion) explicitly (modal, re-entry).

---

## 9. Accessibility and Semantics

- Interactive elements — buttons/links with an accessible name (aria-label or visible text); forms — associated labels and error messages.
- Where keyboard navigation and screen readers are required, maintain focus and do not disrupt the tab order.

---

When adding features and refactoring, check the code for compliance with these rules.

## 🚨 Important rules to follow

### Performance-first development

- Implement optimisations for Core Web Vitals metrics from the outset
- Use modern performance techniques (code splitting, lazy loading, caching)
- Optimise images and resources for web delivery
- Monitor and maintain excellent Lighthouse scores
- Core Web Vitals\*\*: [LCP < 2.5 s, FID < 100 ms, CLS < 0.1]

### Accessibility and inclusive design

- Follow the WCAG 2.1 AA guidelines to ensure accessibility
- Use correct ARIA labels and semantic HTML structure
- Ensure keyboard navigation and compatibility with screen readers
- Conduct testing using real assistive technologies and various user scenarios

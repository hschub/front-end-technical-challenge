# Web Fundamentals — Atomi Interview Prep

---

## Semantic HTML

Use elements for their meaning, not their appearance.

| Element | Purpose |
|---|---|
| `<main>` | Primary page content (one per page) |
| `<header>` | Page or section header |
| `<nav>` | Navigation links |
| `<section>` | Thematic grouping (needs a heading) |
| `<article>` | Self-contained content |
| `<footer>` | Page or section footer |
| `<button>` | Interactive control — not `<div onClick>` |
| `<label>` | Associates text with a form input |
| `<fieldset>` / `<legend>` | Groups related inputs (e.g. a radio group) |

**Why it matters:** screen readers, SEO, and browser built-ins (keyboard nav, form submission) all rely on semantic HTML.

**Common mistakes:**
- Using `<div>` or `<span>` as buttons — loses keyboard focus, role, Enter/Space behaviour
- Missing `<label>` on inputs — screen reader reads "edit text" with no context
- Using heading levels for visual size, not document structure (`<h3>` directly under `<h1>`)

---

## CSS Fundamentals

**Box model:**
```
content → padding → border → margin
```
`box-sizing: border-box` makes `width`/`height` include padding and border. Use this by default.

**Specificity (low → high):**
```
element (p, div)   → 0-0-1
class (.foo)       → 0-1-0
id (#foo)          → 1-0-0
inline style       → beats all selectors
!important         → overrides everything (avoid it)
```

**Layout:**
- **Flexbox** — 1D (row or column). Use for component-level layout.
  - `display: flex; justify-content` (main axis); `align-items` (cross axis)
- **Grid** — 2D. Use for page-level layout.
  - `display: grid; grid-template-columns: repeat(3, 1fr)`

**Positioning:**
| Value | Behaviour |
|---|---|
| `static` | Default, in normal flow |
| `relative` | Offset from normal position, still in flow |
| `absolute` | Removed from flow, positioned relative to nearest non-static ancestor |
| `fixed` | Relative to viewport |
| `sticky` | Relative until scroll threshold, then fixed |

**CSS custom properties:**
```css
:root { --color-primary: #0066cc; }
color: var(--color-primary);
```

**Accessibility and CSS — critical:**
- **Never** use `outline: none` without providing an alternative focus indicator
- WCAG 2.4.7 (Focus Visible): keyboard users must be able to see what is focused
- Use `:focus-visible` instead of `:focus` — only shows on keyboard nav, not mouse click

---

## JavaScript Fundamentals

**Event loop:**
JS is single-threaded. Processing order:
1. Call stack (synchronous code)
2. Microtask queue (Promises, `queueMicrotask`) — drained after each task
3. Task queue / macrotask (`setTimeout`, `setInterval`, I/O)

`Promise.then()` runs **before** `setTimeout` even with `0ms` delay.

**Closures:**
A function that "closes over" variables from its outer scope.

Classic bug:
```js
for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 0) }
// prints 3, 3, 3 — all closures share the same `i`
```
Fix: use `let` (block-scoped) or an IIFE.

**Async/Await:**
- `async` functions always return a Promise
- `await` pauses execution of that function only, not the whole thread
- Always handle errors: `try/catch` or `.catch()`
- Common mistake: forgetting `await` — the function returns a pending Promise, not the value

**Array methods (know these cold):**
| Method | What it does |
|---|---|
| `.map()` | Transforms each element, returns new array |
| `.filter()` | Keeps elements matching predicate, returns new array |
| `.reduce()` | Accumulates to a single value |
| `.find()` | Returns first matching element (or `undefined`) |
| `.some()` | `true` if any element matches |
| `.every()` | `true` if all elements match |

None of these mutate the original array.

**Equality:**
- `==` does type coercion — avoid it
- `===` strict equality — always use this
- `null == undefined` is `true`; `null === undefined` is `false`

**Optional chaining and nullish coalescing:**
```js
user?.address?.street    // returns undefined instead of throwing
value ?? 'default'       // uses right side only if left is null or undefined
value || 'default'       // uses right side if left is ANY falsy value (0, '', false)
```

---

## React Fundamentals

> You know Vue — framing everything relative to that.

| Vue | React equivalent |
|---|---|
| `computed` | `useMemo` / derived state |
| `methods` | regular functions inside component |
| `watch` | `useEffect` |
| `data` | `useState` |
| `props` | props |
| `$emit` | callback props (`onSomething: () => void`) |
| `provide` / `inject` | `useContext` |

**Rules of Hooks:**
1. Only call hooks at the top level — not inside conditions, loops, or nested functions
2. Only call hooks from React function components or custom hooks

React tracks hooks by call order. Conditional calls break that order and cause bugs.

**useState:**
```ts
const [value, setValue] = useState(initialValue)
```
- Never mutate state directly — always create a new reference
- State updates are batched and asynchronous
- If new state depends on old state, use the functional update form:
  ```ts
  setValue(prev => prev + 1)   // ✓
  setValue(value + 1)          // ✗ stale closure risk
  ```

**useEffect:**
```ts
useEffect(() => { ... }, [])        // runs once after first render
useEffect(() => { ... }, [a, b])    // runs when a or b change
useEffect(() => { ... })            // runs after every render
```

**Must return a cleanup function for:**
- `setInterval` / `setTimeout`
- event listeners
- subscriptions / WebSocket connections

**Stale closure:** if you read state inside a `useEffect` that doesn't list that state in deps, you get the value from when the effect was created — not the current value.

Classic bug:
```ts
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1)  // "count" is always 0 — stale closure
  }, 1000)
  // missing: return () => clearInterval(id)
}, [])
```

Fix: `setCount(c => c + 1)` — functional update reads current value.

**useMemo:**
```ts
const result = useMemo(() => expensiveCalc(input), [input])
```
Memoises a computed value. Only recomputes when deps change. Use when computation is expensive or you need a stable object reference.

**useRef:**
- Persists a mutable value without triggering re-renders
- Common uses: DOM node references, storing interval IDs, previous values
- `ref.current` is mutable — changing it does **not** cause a re-render

**Key prop:**
- Helps React identify which list items changed
- Use a stable, unique ID — never the array index when the list can reorder
- Changing the `key` on a component forces it to unmount and remount

---

## Accessibility (a11y)

WCAG 2.1 levels: A (minimum), **AA (standard target)**, AAA (enhanced).

**Four principles (POUR):**
- **Perceivable** — info must be presentable in ways users can perceive
- **Operable** — UI must be operable (keyboard, no time limits)
- **Understandable** — info and UI must be understandable
- **Robust** — content must work with current and future assistive tech

**Keyboard navigation:**
| Key | Action |
|---|---|
| Tab / Shift+Tab | Move between focusable elements |
| Enter | Activate buttons and links |
| Space | Activate buttons, toggle checkboxes |
| Arrow keys | Navigate within a widget (radio group, select, tabs) |
| Escape | Close modals/dialogs |

Native HTML gives you keyboard support for free. Custom components built from divs must manually add: `tabIndex`, `role`, keyboard handlers.

**ARIA roles (prefer native elements first):**
```
role="button"      — for interactive divs acting as buttons
role="radio"       — for custom radio buttons
role="radiogroup"  — wraps a group of radio options
role="progressbar" — with aria-valuenow, aria-valuemin, aria-valuemax
role="dialog"      — for modal overlays (with aria-modal="true")
role="alert"       — live region, announces immediately on change
role="status"      — live region, polite announcement
```

**Key ARIA attributes:**
```
aria-label         — provides accessible name (when no visible label)
aria-labelledby    — points to element that labels this one (id reference)
aria-describedby   — points to element with additional description
aria-checked       — state of checkbox/radio ("true", "false", "mixed")
aria-disabled      — indicates element is disabled
aria-expanded      — whether a collapsible element is open
aria-live          — "polite" or "assertive" for dynamic content updates
aria-hidden        — hides element from assistive tech (e.g. decorative icons)
```

**Key WCAG rules to cite in interview:**
- Color alone must never be the only way to convey information (1.4.1)
- Text must have 4.5:1 contrast ratio with background (1.4.3)
- Interactive elements need a visible focus indicator (2.4.7)
- Images need alt text; decorative images use `alt=""` (1.1.1)
- Form inputs must have associated labels (1.3.1)

**Screen reader testing:**
- macOS: VoiceOver (`Cmd+F5`)
- Windows: NVDA (free)
- iOS/Android: VoiceOver / TalkBack (built-in)

---

## Browser Storage

| | `localStorage` | `sessionStorage` | Cookies | IndexedDB |
|---|---|---|---|---|
| Persists | Until cleared | Tab session | Configurable | Until cleared |
| Shared across tabs | Yes | No | Yes | Yes |
| Sent with requests | No | No | Yes | No |
| JS accessible | Yes | Yes | Yes (unless HttpOnly) | Yes |
| Size | ~5–10 MB | ~5 MB | ~4 KB | Hundreds of MB |

**For quiz state specifically:**
- `localStorage` is fine for single-device, single-session use
- Problems: cleared by user, not shared across devices, no server sync
- Backend persistence solves device-crossing and data durability

---

## Security

**XSS (Cross-Site Scripting):** injecting malicious scripts into a page that runs in another user's browser.

| Type | How |
|---|---|
| Stored XSS | Script saved in DB, served to all users |
| Reflected XSS | Script in URL parameter, reflected back immediately |
| DOM-based XSS | Client-side JS writes attacker-controlled data to the DOM |

**Prevention:**
- Never use `dangerouslySetInnerHTML` with unsanitised content
- If you must, sanitise with DOMPurify first:
  ```tsx
  const clean = DOMPurify.sanitize(dirtyHtml)
  <div dangerouslySetInnerHTML={{ __html: clean }} />
  ```
- Use Content Security Policy (CSP) headers as defence-in-depth
- Avoid `innerHTML`, `document.write`, `eval()`

**CSRF (Cross-Site Request Forgery):** tricks authenticated users into submitting unintended requests.
Prevention: CSRF tokens, `SameSite` cookie attribute, checking `Origin` header.

**Content Security Policy (CSP):**
HTTP header that whitelists trusted content sources. Prevents inline scripts, limiting XSS blast radius.
```
Content-Security-Policy: script-src 'self' https://cdn.trusted.com
```

---

## Web Performance (Basics)

**Critical rendering path:**
```
HTML → DOM → CSSOM → Render Tree → Layout → Paint → Composite
```
Blocking resources (sync scripts, stylesheets) delay First Contentful Paint.

**Core Web Vitals:**
| Metric | Measures | Target |
|---|---|---|
| LCP (Largest Contentful Paint) | Loading performance | < 2.5s |
| INP (Interaction to Next Paint) | Responsiveness | < 200ms |
| CLS (Cumulative Layout Shift) | Visual stability | < 0.1 |

**Quick wins:**
- Lazy load images (`loading="lazy"`)
- Code-split routes (Next.js does this automatically per page)
- Memoize expensive computations (`useMemo`)
- Avoid layout thrash (read all DOM values, then write)
- Use stable `key` props in React lists (avoid unnecessary remounts)

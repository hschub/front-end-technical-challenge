# PR Review Answers
## Do not open until you've reviewed each PR yourself

---

## PR 1 — `feat/keyboard-navigation`
> "feat: add keyboard navigation to answer options"

---

### Issue 1 — Deprecated API
**Where:** `MultipleChoiceQuestion.tsx`, `onKeyDown` handler

```ts
if (e.keyCode === 13 || e.keyCode === 32)
```

`keyCode` is deprecated since DOM Level 3 Events. Modern code uses `e.key` (a string):

```ts
if (e.key === 'Enter' || e.key === ' ')
```

`e.keyCode` is a number and still works in most browsers today, but will eventually be removed and is considered bad practice.

---

### Issue 2 — Missing ARIA role
**Where:** option `<div>` elements in the `NotMarked` variant

```tsx
<div tabIndex={0} onClick={...} onKeyDown={...}>
```

There is no `role` attribute. A screen reader announces this as a generic group — the user has no idea it's a selectable option.

Fix:
```tsx
<div role="radiogroup" aria-labelledby="question-heading">
  <div role="radio" aria-checked={isSelected} tabIndex={0} ...>
```

---

### Issue 3 — Missing `aria-checked`
**Where:** same option divs

Even with `role="radio"`, the selected state is invisible to screen readers without `aria-checked`. The visual highlight is CSS-only.

Fix: `aria-checked={isSelected}` (boolean — React converts it to the right string value).

---

### Issue 4 — `outline: none` kills the focus indicator (WCAG 2.4.7)
**Where:** `MultipleChoiceQuestion.module.css`

```css
.option:focus {
  outline: none;
}
```

This removes the browser's default focus ring entirely. Keyboard users navigating with Tab have no visual indication of which option is focused.

WCAG 2.4.7 (Focus Visible, Level AA): keyboard-operable UI components must have a visible focus indicator.

Fix:
```css
.option:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

`:focus-visible` is better than `:focus` here — it only shows on keyboard navigation, not on mouse click.

---

### Issue 5 — Color alone conveys correct/incorrect, and the logic is wrong (WCAG 1.4.1)
**Where:** `MultipleChoiceQuestion.tsx` (Marked variant) + CSS

```tsx
className={isCorrect ? styles.optionCorrect : styles.optionIncorrect}
```

Two problems:

**a) Color is the only indicator.** Red/green alone fails WCAG 1.4.1 (Use of Color). Users with red-green colour blindness can't distinguish the states. An icon or text label must accompany the colour.

**b) The logic is wrong.** Every non-correct option is marked red/incorrect — including options the student never picked. The correct behaviour:
- Correct option → always show green
- Selected wrong option → show red
- Other options → neutral (no highlight)

The `selectedOptionId` prop is received but completely ignored in the Marked variant — the unused variable is a hint.

---

### Issue 6 — Removing native radio inputs is a major accessibility regression
**Where:** entire component

The PR removes `<input type="radio">` elements entirely. Native radio inputs give you for free:
- Keyboard support (Tab to enter group, Arrow keys to move within it)
- Screen reader announcements ("option A, radio button, 1 of 4")
- Form semantics and grouping

Replacing with divs means manually reimplementing all of this correctly. The ARIA "Radio Group" pattern is non-trivial. Unless there's a strong visual reason to avoid native inputs, prefer them — you can style `<input type="radio">` however you want with CSS while keeping accessibility.

---

**Summary — PR 1:**
1. `e.keyCode` deprecated → use `e.key`
2. Missing `role="radio"` and `role="radiogroup"`
3. Missing `aria-checked`
4. `outline: none` on `:focus` — WCAG 2.4.7 violation
5. Color-only feedback — WCAG 1.4.1 violation; plus incorrect logic marks all non-correct options as wrong
6. Removing native radio inputs discards free keyboard and AT support

---

## PR 2 — `feat/question-timer`
> "feat: track time spent per question"

---

### Issue 1 — Memory leak: `setInterval` not cleaned up
**Where:** `src/ui/hooks/useQuestionTimer.ts`

```ts
React.useEffect(() => {
  const interval = setInterval(() => { ... }, 1000);
  // no return
}, []);
```

The interval is never cleared. When the component unmounts (user finishes the quiz and sees results), the interval keeps firing. This is a memory leak and causes state updates on an unmounted component.

Fix — return a cleanup function:
```ts
React.useEffect(() => {
  const interval = setInterval(() => { ... }, 1000);
  return () => clearInterval(interval);
}, []);
```

Every `setInterval`, `setTimeout`, event listener, or subscription created in `useEffect` needs cleanup. This is one of the most common React bugs.

---

### Issue 2 — Stale closure: the timer will never advance past 1 second
**Where:** `src/ui/hooks/useQuestionTimer.ts`

```ts
const [seconds, setSeconds] = React.useState(0);

React.useEffect(() => {
  const interval = setInterval(() => {
    setSeconds(seconds + 1);  // stale closure
  }, 1000);
}, []);
```

The dependency array is `[]`, so the effect runs once. The callback inside `setInterval` closes over the initial value of `seconds` (which is `0`). Every tick calls `setSeconds(0 + 1)`. The timer will never advance past 1 second.

Fix — functional update form:
```ts
setSeconds(s => s + 1);
```

This receives the current value as an argument instead of closing over a stale variable.

**General rule:** if your `setState` call depends on the current value of state, always use `setState(prev => ...)`.

---

**Summary — PR 2:**
1. Memory leak — `setInterval` never cleared on unmount
2. Stale closure — `setSeconds(seconds + 1)` always adds to the initial `0`; fix: `setSeconds(s => s + 1)`

---

## PR 3 — `feat/markdown-rendering`
> "feat: render markdown formatting in question content"

---

### Issue 1 — XSS vulnerability: no sanitisation (and the comment lies)
**Where:** `src/ui/components/common/Markdown.tsx`

```ts
// Parse and sanitize markdown for safe rendering
const html = marked.parse(children) as string;
<div dangerouslySetInnerHTML={{ __html: html }} />
```

The comment says "sanitize" but `marked.parse()` does **not** sanitise HTML. It converts markdown syntax to HTML tags. Any raw HTML already in the input passes through unchanged.

Example:
```
Input:  "**bold** <script>alert('xss')</script>"
Output: "<strong>bold</strong> <script>alert('xss')</script>"
```

If quiz content ever comes from user input or an untrusted CMS, this is a stored XSS vulnerability — the script runs in every student's browser.

Fix:
```ts
import DOMPurify from 'dompurify';
const html = DOMPurify.sanitize(marked.parse(children) as string);
```

The misleading comment makes this worse — it gives false confidence that sanitisation is already happening.

---

### Issue 2 — Unsafe type assertion
**Where:** `marked.parse(children) as string`

`marked.parse()` has the return type `string | Promise<string>`. The `as string` cast silences the TypeScript error but doesn't fix the problem. If `marked.parse()` returns a Promise, `dangerouslySetInnerHTML` receives `[object Promise]` — broken, not HTML.

The `as` cast is a red flag in TypeScript — it usually means a type error was silenced rather than fixed.

Fix: ensure synchronous output:
```ts
import { marked } from 'marked';
// marked defaults to synchronous; be explicit if needed
const html = marked.parse(children, { async: false });
```

---

### Issue 3 — No memoisation: parsing runs on every render
**Where:** `const html = marked.parse(children) as string;`

`marked.parse()` is called on every render of the component. If a parent re-renders for unrelated reasons (quiz state updates, a counter), the markdown is reparsed unnecessarily.

Fix:
```ts
const html = React.useMemo(
  () => DOMPurify.sanitize(marked.parse(children) as string),
  [children]
);
```

Only re-parses when the content actually changes.

---

**Summary — PR 3:**
1. XSS — `marked.parse()` doesn't sanitise; misleading comment says it does; fix with DOMPurify
2. Unsafe `as string` cast hides a real type error
3. No `useMemo` — markdown reparsed on every render

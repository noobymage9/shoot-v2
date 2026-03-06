# Code Style Rules

## Classes — prefer classes over loose functions

Always write code as classes where possible. Group related functions and state into a class rather than exporting bare functions.

```js
// Bad
export function renderShareOffer(pasteId) { ... }
export function showError(message) { ... }

// Good
export class UI {
  static renderShareOffer(pasteId) { ... }
  static showError(message) { ... }
}
```

Use private fields (`#field`) and private methods (`#method()`) to encapsulate internal state and implementation details.

## Conditionals — prefer early returns over if/else chains

Extract conditional logic into a function and use early returns instead of if/else if ladders.

```js
// Bad
let value;
if (x === 'a') {
  value = A;
} else if (x === 'b') {
  value = B;
} else {
  value = C;
}

// Good
function resolveValue(x) {
  if (x === 'a') return A;
  if (x === 'b') return B;
  return C;
}

const value = resolveValue(x);
```

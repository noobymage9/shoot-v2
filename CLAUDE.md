# Code Style Rules

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

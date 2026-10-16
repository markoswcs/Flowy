// Several layers (menus, sheets, multi-select) can be open at once. Each one
// holds the "has-overlay" body class, which hides the floating create button,
// and it is only removed when the last of them closes.
let holders = 0;

export function holdOverlay() {
  holders += 1;
  document.body.classList.add("has-overlay");
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) document.body.classList.remove("has-overlay");
  };
}

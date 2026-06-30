## Cause

In `src/routes/journey.tsx`, each row is structured like this:

```tsx
<button onClick={...}>      // line 288
  <div>Heart Note · date</div>
  <h3>{title}</h3>
  {isOpen && (
    <>
      <p>{body}</p>                      // ← block element inside <button>
      <div className="border-l-4 ...">   // ← block element inside <button>
        <p>...</p>
      </div>
    </>
  )}
</button>
```

HTML forbids `<p>` and `<div>` inside `<button>`. The browser quietly reparents them out of the button on mount, which leaves React's virtual DOM and the real DOM out of sync. Net effect: click handler fires, `open` state toggles, but the expanded body never visibly mounts under the row.

This is also the source of the hydration mismatch warning that's been in the console.

## Fix

Restructure each row in `src/routes/journey.tsx` so the clickable header and the expanded body are **siblings**, not parent and child:

```tsx
<div className="glass rounded-2xl p-5">
  <div className="flex items-start justify-between gap-3">
    <button onClick={() => setOpen(...)} className="flex-1 min-w-0 text-left">
      <div>Heart Note · date</div>
      <h3>{title}</h3>          {/* or the edit input */}
    </button>
    <div>{/* action buttons: edit / delete / chevron */}</div>
  </div>

  {isOpen && !isEditing && (
    <div className="mt-2">
      {isHeart && <p>{body}</p>}
      {extra && <div className="border-l-4 ...">...</div>}
    </div>
  )}
</div>
```

That's the only change. Behavior, styling, and all the existing edit/delete logic stay identical — the expanded block just moves out of the `<button>` and becomes a sibling under the card wrapper.

## What I'm not changing

- No data-fetching changes.
- No state, no animation, no styling tweaks beyond what's required to move the block out of the button.
# Plugin Loading Fix: sidebar.brand Slot Conflict

## Problem
The `@deepseek-ai/dsh-client-ui-terminal-console` plugin was failing to load with the error:
```
Failed to load plugins
@deepseek-ai/dsh-client-ui-terminal-console
failed to apply loader entry 7c85bcc9 (@deepseek-ai/dsh-client-ui-terminal-console): 
slot "sidebar.brand" is already declared (by an entry in "sidebar" (x6)), please fix it
```

## Root Cause
The terminal-console plugin registers into the `sidebar` slot with `priority: -1` to shadow the default sidebar. It was declaring a `children` object with `sidebar.brand` slot, but that slot was already declared by another entry in the sidebar slot (likely from `ui-sidebar` or `ui-layout`).

In the slot system, when multiple entries register into the same parent slot, only ONE entry should declare each child slot. Re-declaring a child slot causes a conflict.

## Solution
Three coordinated changes:

### 1. Removed `children` declaration from slot registration
**File:** `packages/ui-terminal-console/src/client/index.ts`

Removed the `children` object from the `ctx.slots.register()` call (previously at line 72):
```typescript
ctx.slots.register({
  name: 'sidebar',
  priority: -1,
  // children: { 'sidebar.brand': ... } <- REMOVED
  inject: (): SessionStripInjected => ({ ... }),
}, SessionStrip)
```

### 2. Made `renderSlot` optional in component props
**File:** `packages/ui-terminal-console/src/client/SessionStrip.tsx`

Changed line 19 from:
```typescript
& PropsRenderSlots<'sidebar.brand'>
```
to:
```typescript
& Partial<PropsRenderSlots<'sidebar.brand'>>
```

### 3. Added conditional rendering
**File:** `packages/ui-terminal-console/src/client/SessionStrip.tsx`

Changed line 61 from:
```typescript
<div className={css.brand}>{renderSlot('sidebar.brand', {})}</div>
```
to:
```typescript
{renderSlot && <div className={css.brand}>{renderSlot('sidebar.brand', {})}</div>}
```

## How It Works
- The `sidebar.brand` slot is declared by the ui-sidebar plugin (or ui-layout)
- The terminal-console plugin shadows the sidebar slot without re-declaring its children
- The SessionStrip component gracefully handles the case where it doesn't have access to render the brand slot
- If the slot system provides `renderSlot`, the brand area (clock/wordmark) will render; otherwise, it's omitted

## Testing
To verify the fix works:
1. Rebuild the project: `pnpm run build`
2. The plugin should load without the "slot already declared" error
3. The terminal console should render correctly with the session strip

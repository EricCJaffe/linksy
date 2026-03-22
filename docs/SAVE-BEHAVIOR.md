# Save Behavior & Undo/Redo

## Overview

Linksy uses **explicit manual save** for all form-based editing. There is no auto-save — users must click a "Save" or "Save Changes" button to persist data. A small number of interactions use **instant save** (no button required), and these now include an Undo toast.

## Save Patterns

### 1. Manual Save (Explicit Button)

The vast majority of screens require clicking a Save button. The button is disabled until changes are detected (`isDirty` / `hasChanges`), and shows "Saving..." during the request.

| Screen | Component | Save Trigger |
|--------|-----------|-------------|
| Profile Settings | `profile-form.tsx` | "Save Changes" button (React Hook Form) |
| Branding Settings | `branding-form.tsx` | "Save Changes" button (React Hook Form) |
| Custom Terminology | `terminology-editor.tsx` | "Save Changes" button |
| Provider Detail (edit mode) | `provider-detail-tabs.tsx` | "Save Changes" button |
| Provider Notes | `provider-detail-tabs.tsx` | "Add Note" / "Save" button |
| Provider Locations | `provider-detail-tabs.tsx` | "Save Location" button |
| Ticket Comments | `ticket-detail-panel.tsx` | "Add Comment" / "Save" button |
| Support Ticket Comments | `support/[id]/page.tsx` | "Send" / "Add Comment" button |
| Contact Notes | `contacts/[id]/page.tsx` | "Add" / "Save" button |
| Email Templates | `email-template-editor.tsx` | "Save" button |
| Call Logs | `ticket-detail-panel.tsx` | "Save Call Log" button |

**All dialog forms** (contact management, create ticket, need form, forward ticket, etc.) also use explicit form submission.

### 2. Instant Save (No Button — Undo Available)

These interactions persist immediately on user action with no Save button. They show an **Undo toast** for 5 seconds allowing the user to revert.

| Interaction | Location | Undo? |
|-------------|----------|-------|
| Referral status dropdown | Tickets list page, Ticket detail panel | Yes - toast with Undo |
| Comment privacy toggle | Ticket detail panel (site admin only) | Yes - toast with Undo |

### 3. Destructive Actions (Confirmation Dialog)

Destructive actions show a `confirm()` dialog before executing. No undo toast needed since the user explicitly confirms.

| Action | Location |
|--------|----------|
| Delete call log | Ticket detail panel |
| Delete location | Provider detail |
| Bulk status update | Tickets list page |
| Provider freeze | Provider detail |

## Undo/Redo

### Rich Text Editor (TipTap)

The rich text editor (used for comments and notes) supports:
- **Ctrl+Z / Cmd+Z** — Undo (keyboard shortcut, always available)
- **Ctrl+Y / Cmd+Shift+Z** — Redo (keyboard shortcut, always available)
- **Toolbar buttons** — Undo and Redo buttons in the editor toolbar
- History depth is managed by TipTap's built-in History extension

### Instant-Save Undo (`useUndoableAction` hook)

For instant-save interactions, the `useUndoableAction` hook (`lib/hooks/useUndoableAction.ts`) provides:
- Executes the action immediately
- Shows a toast with an "Undo" button for 5 seconds
- Clicking "Undo" reverts the action by calling the reverse mutation
- After 5 seconds, the toast dismisses and the action is final

Usage:
```typescript
const { execute: undoableAction } = useUndoableAction()

undoableAction({
  description: 'Status changed to In Process',
  action: () => updateTicket.mutate({ id, status: 'in_process' }),
  undoAction: () => updateTicket.mutate({ id, status: previousStatus }),
})
```

### Form Cancel/Reset

All form-based editing supports cancel:
- **Provider edit mode**: "Cancel" button resets all fields to their original values
- **Dialog forms**: Closing the dialog discards unsaved changes
- **React Hook Form**: `reset()` restores the form to its initial values
- **Note/comment editing**: "Cancel" button exits edit mode without saving

## What Is NOT Auto-Saved

To be explicit — none of the following auto-save:
- Provider details (name, description, contact info, etc.)
- Settings (profile, branding, terminology)
- New comments or notes (must click Add/Save)
- Comment edits (must click Save)
- Location additions or edits
- Email template customizations
- Call log entries
- Any dialog form content

// Display-only tweaks for the roles UI. Permission keys (e.g. `tickets.view_list`)
// are what the backend stores and checks, so they are never renamed here.

// Permissions for features that no longer exist, so they are not shown or editable.
const HIDDEN_ROLE_PERMISSIONS = new Set([
  'tickets.edit_type',
  'tickets.edit_priority',
  'tickets.edit_due_date',
]);

export function isHiddenRolePermission(permission: string) {
  return HIDDEN_ROLE_PERMISSIONS.has(permission.replace(/:/g, '.').trim());
}

// The product calls tickets "leads" everywhere in the UI.
export function toLeadWording(text: string) {
  return text
    .replace(/\bTicket(s?)\b/g, 'Lead$1')
    .replace(/\bticket(s?)\b/g, 'lead$1');
}

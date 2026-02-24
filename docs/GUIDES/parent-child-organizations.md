# Parent/Child Organizations Guide

## Overview

The parent/child organization system allows multi-location organizations to:
- Link multiple provider locations under a parent organization
- Inherit administrative access from parent to all child locations
- View aggregated statistics across all locations
- Perform bulk operations on child locations

## Key Concepts

### Parent Organization
- The main or headquarters location
- Can have multiple child locations
- Admins of parent org automatically have access to all children
- Cannot itself be a child of another organization (one level only)

### Child Location
- A location that belongs to a parent organization
- Inherits admin access from parent
- Can have its own staff and contacts
- Shows up in parent's aggregated dashboard

### Standalone Organization
- A provider with no parent and no children
- Independent organization

## For Site Administrators

### Linking a Child to a Parent

1. Navigate to the child provider's detail page
2. Go to the **Summary** tab
3. Find the **Organization Structure** card
4. Click **Link to Parent**
5. Search for the parent organization by name
6. Select the parent from the search results
7. Click **Link to Parent** to confirm

**Requirements:**
- You must be a site administrator
- The parent cannot itself be a child (one-level hierarchy only)
- The child cannot already have children (no multi-level nesting)

### Unlinking a Child from a Parent

1. Navigate to the child provider's detail page
2. Go to the **Summary** tab
3. Find the **Organization Structure** card
4. Click **Unlink** next to the parent organization name
5. Confirm the unlinking

This converts the child back to a standalone organization.

### Filtering Providers by Organization Type

In the **Providers** list page:

1. Use the **Organization Type** dropdown filter:
   - **All Organizations**: Show all providers (default)
   - **Parent Organizations**: Only show orgs with children
   - **Child Locations**: Only show child providers
   - **Standalone**: Only show orgs with no parent/children

## For Parent Organization Admins

### Viewing the Organization Dashboard

1. Navigate to your parent organization's detail page
2. Click the **Organization Dashboard** tab
3. View aggregated statistics across all locations

**Dashboard Features:**
- Summary cards (locations, referrals, interactions, events)
- Engagement breakdown (profile views, clicks)
- Location performance table with drill-down links
- Date range filtering for time-based analysis

### Performing Bulk Operations on Children

From the **Organization Dashboard** tab:

1. Use checkboxes to select child locations
2. Click **Select All** to select all children at once
3. Choose a bulk action:
   - **Activate**: Set selected children to active status
   - **Deactivate**: Set selected children to inactive status
   - **Pause**: Set selected children to paused status
4. Changes are applied immediately

### Navigating Between Locations

**Breadcrumbs:**
- Child pages show breadcrumb: `Parent Org > Child Name`
- Click the parent name to navigate to parent page

**Quick Switcher:**
- Click the organization dropdown next to the page title
- Select any location to navigate instantly
- Current location is highlighted

## For Provider Staff

### Understanding Access Inheritance

If you are an admin contact for a parent organization:
- You automatically have admin access to all child locations
- You can view and edit all child provider details
- You can manage contacts, notes, and referrals for children
- You appear in the access list for each child location

### Managing Your Location

**If you're staff at a child location:**
- You can view and edit your own location's details
- You can see the parent organization name in the Summary tab
- Contact your site administrator to link/unlink from a parent

**If you're staff at a parent organization:**
- Use the Organization Dashboard to oversee all locations
- Navigate between locations using the quick switcher
- Perform bulk operations to manage all locations at once

## Best Practices

### Organization Structure
- Use parent/child for true multi-location organizations
- Keep standalone for independent providers
- Don't create complex hierarchies (only one level supported)

### Admin Assignment
- Assign parent-level admins for centralized management
- Assign location-specific staff for day-to-day operations
- Use bulk operations for consistency across locations

### Reporting
- Use date range filters to analyze specific time periods
- Export aggregated data from the Organization Dashboard
- Drill down to individual locations for details

## Technical Notes

### Access Control
- Parent admins inherit access via database function `linksy_user_can_access_provider()`
- Access is checked on all provider detail, location, and note endpoints
- Site admins always have access to all providers

### Data Aggregation
- Dashboard aggregates: referrals, interactions, events, notes, locations
- Date filtering applies to: referrals, interactions, events, notes (by created_at/event_date)
- Location counts are not date-filtered

### Performance
- Child counts fetched on-demand (not pre-computed)
- Organization Dashboard uses parallel queries for efficiency
- Bulk operations run in parallel with Promise.all()

## Troubleshooting

### "This provider is already a parent of other providers"
You cannot make a parent organization into a child. Unlink its children first.

### "The selected parent is itself a child provider"
You can only link to top-level (parent) organizations. Select a different parent.

### "Organization Dashboard" tab not showing
This tab only appears for parent organizations with at least one child.

### Bulk operations not working
Ensure you have selected at least one child location using the checkboxes.

## Support

For additional assistance:
- Contact Linksy Support via the support button
- Refer to the Features Checklist for capability overview
- Check DECISIONS docs for architectural details

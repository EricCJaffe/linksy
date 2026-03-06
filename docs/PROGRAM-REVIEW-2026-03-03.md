# Linksy Program Review — Task List

> Source: 1st Review of New Program (3-3-2026) by Heather Johnston
> Extracted and organized for Claude Code integration.
> Master tracking in `docs/TASKS.md`. This file preserved as original reference.

---

## Legend

- **[PROMPT READY]** = Actionable code task
- **[CLARIFY FIRST]** = Needs a decision before coding
- **[WISH LIST]** = Future feature / backlog

---

## TASK-001 — Language/Terminology Replace (System-Wide) [PROMPT READY]

Global find-and-replace across all UI labels, dropdowns, column headers, email templates, page titles:
- "Customer" -> "Client"
- "Needs" -> "Services"
- "Actions" -> "Status" / "Statuses"
- "Tickets" -> "Referrals"
- "Needs Addressed" (in dropdowns) -> "Services Provided"

Applies to: frontend UI strings, email templates, exported reports, database column display labels (not column names), dropdown text.

## TASK-002 — Add Undo Feature System-Wide [PROMPT READY]

System auto-saves. Users need undo for accidental edits. Undo button (Ctrl+Z) + Redo (Ctrl+Y) on all data entry screens. Min last 5 actions per session. Works for: field edits, status changes, note additions, contact updates. Tooltip for non-undoable actions (e.g., sent email).

## TASK-003 — Add Filters to All Columns System-Wide [PROMPT READY]

Every data table needs filterable column headers. Filter icon/dropdown per column. Filters: date ranges, zip codes, name search, phone, email, referral number. Persist within session. "Clear All Filters" button. URL params for shareability. Apply to: Referrals, Providers, Contacts, Dashboard widgets, Aging Referrals, report views.

## TASK-004 — Phone Number Format Standardization [PROMPT READY]

Enforce format: 1-(XXX)-XXX-XXXX. Add "Ext." field next to every phone field. Apply to: Provider, Contact, Referral screens and forms. Update display in list views and exported reports. Update email templates to match format.

## TASK-005 — Email Bounce Handling [CLARIFY FIRST]

Current: system retries sending repeatedly, floods admin inbox. Decisions needed:
1. Stop retrying after 1 bounce or N bounces?
2. Flag record with "Bad Email" status?
3. ONE admin notification per bounce (not repeated)?
4. Auto-queue to "Needs Email Verification"?

## TASK-006 — Global Search Enhancement [PROMPT READY]

Upgrade search bar: dropdown showing recent results while typing. Search across: client name, phone, email, referral number. Show last 10 recent searches before typing. Each result: Name, Referral #, Status (color-coded), record type. Click navigates to record.

## TASK-007 — Fix Misspellings on Features Tab (Pre-Login) [PROMPT READY]

Audit "Features" tab on pre-login home screen for typos and spacing errors. Under "How It Works", update copy: "Receive referral tickets from AI-assisted searches via email" (add "via email").

## TASK-008 — Provider Source Tagging [PROMPT READY]

Add "Source" field to Provider: dropdown + free text. Presets: Clay County (CC), United Way (UW), Impact Works (IW), Self-Registered, Other. Filterable column in Providers list. Include in exports and analytics.

## TASK-009 — Provider Self-Registration Intake Form [CLARIFY FIRST]

Decisions needed:
1. Is form identical to internal Provider info page?
2. Who has edit permissions on form structure?
3. Auto-approve if from United Way, or require admin approval?
4. Allow providers to select referral vs non-referral status?

## TASK-010 — Provider Approval Workflow [CLARIFY FIRST]

Decisions needed:
1. Approval screen location in dashboard?
2. Bulk import from UW bypasses approval?
3. Dedicated "Pending Approval" queue tab?

## TASK-011 — Provider Filter and Export by Source / Zip [PROMPT READY]

Export button on Providers list. CSV and Excel. Include: Name, Contact Name, Email, Phone, Zip, Source, Date Added, Status. Filter before export: by Source, Zip, Date range. Show count before export.

## TASK-012 — Restore Record Count at Bottom of Lists [PROMPT READY]

Every paginated list: "Showing X-Y of Z records". When rows selected: "X selected" count. Apply to: Referrals, Providers, Contacts, all dashboard sub-lists.

## TASK-013 — Add Contacts to Right-Side Navigation Panel [PROMPT READY]

"Contacts" link missing from right panel of home/dashboard. Add it, linking to full Contacts list. Contacts tab should be standalone section.

## TASK-014 — Add Status Values: "Transferred Another Provider" and "In Process" [PROMPT READY]

New referral statuses for both Providers and Admins:
- "In Process" - actively being worked on
- "Transferred Another Provider" - passed to different provider

Must appear in filters, reports. Color-coded. Trigger email notifications. Include in Aging Referrals.

## TASK-015 — Dashboard Provider Volume Chart Enhancement [PROMPT READY]

Rename to "Top Providers by Referral Volume." Clickable bars drill down to top 3 services. Toggle: Top 10 Providers vs. Top 10 with top 3 services inline. Date range filter.

## TASK-016 — Fix Aging Referrals Not Loading [PROMPT READY]

Bug: dashboard shows X pending under Aging Referrals but clicking shows no results. Debug query/filter logic. Add column filters (Services, Provider, Date, Status). Add sort on all columns.

## TASK-017 — Test Referral Button on Provider Screen [PROMPT READY]

"Send Test Referral" button on Provider detail screen. Auto-populate: Last=Coolmint, First=Mega, Email=Linksy@impactworks.org, Phone=1-904-330-1848. Flag as TEST, excluded from analytics. Confirmation dialog.

## TASK-018 — Auto-Exclude Test Referrals from Analytics [PROMPT READY]

Boolean `is_test` flag. Auto-flag "Mega Coolmint" (case-insensitive) and test button referrals. Exclude from: dashboard counts/charts, reports, totals, aging view. Admin toggle to include for debugging. Visual "TEST" badge on list items.

## TASK-019 — Provider Freeze / Hold Feature [PROMPT READY]

Freeze button with reason dropdown (Vacation, Awaiting Funding, Temporary Closure, Other) and optional return date. Frozen = no new referrals. Self-freeze only if all Pending cleared. Admin can freeze/unfreeze anytime. "Frozen" badge. Filter by frozen + date range. Freeze history in audit log.

## TASK-020 — Add Call Log and Notes to Provider Contact Screen [PROMPT READY]

Call Log + Notes on Provider Contact page (currently only on Referrals). Note types: General, Outreach, Update, Internal. Private toggle changeable after creation. Author name, timestamp, note type. Edit button with original + edit timestamps. Add comment box at top, newest first.

## TASK-021 — Provider Preview Screen [WISH LIST]

"Preview" button showing admin how provider appears to clients on public search. Low priority.

## TASK-022 — Voicemail Reminder Popup on Referral Submission [PROMPT READY]

Popup on referral submit: "Check your voicemail: IS IT WORKING? IS IT FULL?" with "Got it, Continue" / "Cancel". Once per session.

## TASK-023 — Services/Needs Access Control (Admin Only) [PROMPT READY]

Only Admin can add/edit service categories. Providers can view and remove from own profile but not add/edit system categories. Permission error if Provider attempts. Synonyms also admin-only.

## TASK-024 — Services List Default to Expanded View [PROMPT READY]

Default to expanded (all categories open). "Collapse All" / "Expand All" toggle. Applies to admin and provider-facing screens.

## TASK-025 — Export Services / Needs Categories [PROMPT READY]

Export button on Services admin screen. Excel with: Category, Service Name, Synonyms, Provider count. Full hierarchy.

## TASK-026 — Referral Transfer Workflow [PROMPT READY]

On transfer: auto-update original to "Transferred Another Provider". Modal: select new provider, transfer notes, editable email templates (client + new provider). New queue status: "Transferred Pending". Suffix: -T1, -T2. Max 2 transfers, then admin override. Both providers see transfer history.

## TASK-027 — Notes Section: Edit Button + Ordering Fix [PROMPT READY]

Add Comment box at TOP (currently below). Newest first. Edit button per comment showing original + edit timestamps (not destructive). Undo/Redo in editor. Apply to all notes sections.

## TASK-028 — Private/Public Note Toggle [PROMPT READY]

Private toggle per note. Private = visible only to creating org. Can toggle anytime (author or admin). Lock icon for private. Include privacy state in exports.

## TASK-029 — Duplicate Referral Detection [PROMPT READY]

Case A: Same client, 5 providers, same service, same day = allow but flag. Case B: Same client, same provider, same service, same day = block. Case C: Same client+provider on consecutive days = warning. Detection key: client identity + provider + service + date. Admin "Potential Duplicates" report. Test referrals exempt.

## TASK-030 — Referral Analytics Date Range and Counting [PROMPT READY]

Date range filter on all analytics (presets: week/month/quarter/year/custom). Count unique client+service combos (housing-related = deduplicated). "True Unique Clients" metric. Admin toggles: exclude test, exclude blank service, exclude test users. Sort ascending/descending. Default alphabetical.

## TASK-031 — Analytics Report: Required Visuals [PROMPT READY]

Reports needed: (1) Total Referrals, (2) Deduplicated per service per client, (3) By date range, (4) Top Services, (5) Top Categories, (6) Clients with multiple referrals same need, (7) Clients with most referrals by month/year, (8) Status breakdown by provider, (9) Zip code breakdown with map, (10) Returning client flag with prior case number. Exclude test by default.

## TASK-032 — Provider Referral Timeout / SLA Tracking [WISH LIST]

Per-provider custom resolution timeframe. Auto-send reminder at due date. Provider can: reset, confirm, or transfer. Client notification on transfer. Medium priority, next phase.

## TASK-033 — Support Tickets: Visible Tab [PROMPT READY]

Move support ticket access to main navigation (under Referrals or top-level). Show open + in-progress, color-coded. Admins see all, providers see own.

## TASK-034 — Update From Email Address [CLARIFY FIRST]

Current: Linksy@impactclay.org. Needed: Linksy@impact-works.org (confirm). Decision: rename existing mailbox or create new + forward. Then update all templates, From/Reply-To fields, provider-facing contact info.

## TASK-035 — Welcome Email Template for New Providers [PROMPT READY]

Auto-send on provider approval. Subject: "Welcome to Linksy's Provider Program". Body includes: video link, support info, Helps & Docs reference, Support Ticket instructions. Editable template in Admin Console. Test send button.

## TASK-036 — Build Contacts Tab as Standalone Section [PROMPT READY]

Top-level "Contacts" nav tab. List: Name, Organization, Phone, Email, Role/Title, Date Added. Filterable/sortable. Search by name without knowing org. Export CSV/Excel for bulk labels.

## TASK-037 — Remove "Impact Clay" as Active Option [CLARIFY FIRST]

Remove from active dropdowns, preserve historical data. Decisions: archive (read-only) or delete from active? Migrate historical referrals to Impact Works or keep attributed?

## TASK-038 — Referral Number Scale Check [PROMPT READY]

Verify R-XXXX-XX handles 10K-100K referrals. Expand format if needed. Transfer suffix: -T1, -T2. Confirm system-wide uniqueness.

## TASK-039 — Text Color Tool Bug Fix in Notes Editor [PROMPT READY]

Color button in rich text editor inconsistent (sometimes needs right-click + double-click). Fix to single left-click. Test Chrome/Firefox/Edge/Safari. Preserve color on save. Apply to all editors.

---

## WISH LIST BACKLOG

| # | Feature | Notes |
|---|---------|-------|
| WL-001 | Address label printing (Avery 8160) | By zip, region, county, sector |
| WL-002 | Envelope printing (#10 envelope) | IW return address |
| WL-003 | Admin preview of client-facing Provider listing | Preview button |
| WL-004 | Phone system VM-to-notes integration | Like Teams voicemail transcription |
| WL-005 | Per-provider SLA timers | Custom days per provider |
| WL-006 | Provider relationship tracking by contact vs. video | Flag providers needing in-person touch |
| WL-007 | Provider survey feature | Satisfaction survey |
| WL-008 | Synonyms management for services | Admin-only |
| WL-009 | Zip-code gap analysis map | Service desert visualization |
| WL-010 | CoPilot / AI query assistant | Non-technical admin analytics queries |

---

## OPEN SECTIONS (Heather to Review)

- Reports tab -- full review pending
- Notifications tab -- full review pending
- Help & Docs tab -- full review pending
- Admin Console -- full review pending
- Provider Portal Preview -- full review pending
- Public Search Preview -- full review pending

-- Migration: Seed Help & Docs articles
-- Adds glossary/role definitions, contact entry instructions, intake specialist guide,
-- referral lifecycle statuses, and referral creation instructions

-- 1. Glossary / Role Definitions
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Glossary & Role Definitions',
  'glossary-role-definitions',
  '<h2>Glossary &amp; Role Definitions</h2>
<p>This guide defines the key roles and terms used throughout the Linksy portal.</p>

<h3>User</h3>
<p>A <strong>User</strong> is any person with login access to the Linksy portal. Users can search for community resources using the Find Help widget and submit referral requests on behalf of clients. All portal members start as a User.</p>

<h3>Intake Specialist</h3>
<p>An <strong>Intake Specialist</strong> (also called an Intake Specialist in the Team Management page) is a staff member at a provider organization who receives and processes incoming referrals. Intake Specialists can:</p>
<ul>
  <li>View and manage referrals assigned to their organization</li>
  <li>Update referral statuses (e.g., In Process, Service Provided, Transferred)</li>
  <li>Add comments and call logs to referrals</li>
  <li>View client contact information for follow-up</li>
</ul>

<h3>Provider Employee</h3>
<p>A <strong>Provider Employee</strong> is a user who has been linked to a provider organization as a contact. Provider Employees can access referrals, contacts, and resources specific to their organization. In the portal, Provider Employees appear on the <strong>Team Management</strong> page of their organization.</p>

<h3>Tenant Admin</h3>
<p>A <strong>Tenant Admin</strong> is an administrator for a specific region or tenant (e.g., Clay County). Tenant Admins have elevated permissions and can:</p>
<ul>
  <li>View all referrals across all providers in their tenant</li>
  <li>Manage provider organizations and their settings</li>
  <li>Add and remove users from the tenant</li>
  <li>Access analytics and reporting dashboards</li>
  <li>Manage the services taxonomy (needs/categories)</li>
  <li>Configure system settings for their tenant</li>
</ul>

<h3>Provider</h3>
<p>A <strong>Provider</strong> is a community organization (nonprofit, government agency, faith-based organization, or business) that offers services to the community. Providers are listed in the Linksy directory and can receive referrals. Each Provider has:</p>
<ul>
  <li>A profile with name, description, and sector classification</li>
  <li>One or more physical locations with addresses</li>
  <li>A list of services (needs) they address</li>
  <li>Contacts (staff) who manage referrals</li>
  <li>Optional: service ZIP codes defining their coverage area</li>
</ul>

<h3>Provider Contact</h3>
<p>A <strong>Provider Contact</strong> is a person associated with a provider organization. Contacts are listed on the provider''s detail page and can be assigned specific roles:</p>
<ul>
  <li><strong>Admin</strong> — Full access to the provider''s referrals, settings, and team management</li>
  <li><strong>User</strong> — Can view and respond to referrals assigned to their provider</li>
</ul>
<p>Provider Contacts receive email notifications when new referrals are submitted to their organization.</p>

<h3>Team Management Page</h3>
<p>The <strong>Team Management</strong> page is where provider administrators manage their organization''s staff. From this page, admins can:</p>
<ul>
  <li>View all Intake Specialists (staff) linked to the provider</li>
  <li>Add new team members by email invitation</li>
  <li>Assign roles (Admin or User) to team members</li>
  <li>Remove team members from the organization</li>
</ul>
<p>To access Team Management, navigate to <strong>My Organization → Team</strong> in the dashboard sidebar.</p>',
  'Definitions of all user roles and key terms in Linksy: User, Provider Employee, Tenant Admin, Provider, Provider Contact, and Team Management.',
  'Getting Started',
  'user',
  true,
  10
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 2. Contact Info Entry Instructions
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Entering Contacts into the Portal',
  'contact-info-entry-instructions',
  '<h2>Entering Contacts into the Portal</h2>
<p>This guide explains how to add and manage contacts (clients and provider employees) in the Linksy portal.</p>

<h3>Adding a New Contact</h3>
<ol>
  <li>Navigate to <strong>Contacts</strong> in the dashboard sidebar.</li>
  <li>Click the <strong>Add Contact</strong> button in the upper right.</li>
  <li>Fill in the required fields:
    <ul>
      <li><strong>First Name</strong> — The contact''s first name (required)</li>
      <li><strong>Last Name</strong> — The contact''s last name (required)</li>
      <li><strong>Email</strong> — A valid email address (required for portal access)</li>
      <li><strong>Phone</strong> — Primary phone number with area code</li>
    </ul>
  </li>
  <li>Select the <strong>Contact Type</strong>:
    <ul>
      <li><strong>Customer</strong> — A community member seeking services</li>
      <li><strong>Provider Employee</strong> — A staff member at a provider organization</li>
    </ul>
  </li>
  <li>Click <strong>Save</strong> to create the contact.</li>
</ol>

<h3>Editing Contact Information</h3>
<ol>
  <li>Navigate to <strong>Contacts</strong> and find the contact you want to edit.</li>
  <li>Click on the contact''s name to open their detail page.</li>
  <li>Update any of the available fields (name, email, phone, etc.).</li>
  <li>Changes save automatically or click <strong>Save</strong> when prompted.</li>
</ol>

<h3>Adding Notes to a Contact</h3>
<ol>
  <li>Open the contact''s detail page.</li>
  <li>Scroll to the <strong>Notes</strong> section.</li>
  <li>Click <strong>Add Note</strong> and type your note.</li>
  <li>Select a note type (General, Outreach, Update, or Internal).</li>
  <li>Click <strong>Save</strong> to attach the note to the contact record.</li>
</ol>

<h3>Searching for Existing Contacts</h3>
<p>Before adding a new contact, always search first to avoid duplicates:</p>
<ul>
  <li>Use the search bar on the Contacts page to search by name, email, or phone number.</li>
  <li>The system performs case-insensitive matching and will flag potential duplicates.</li>
  <li>If a duplicate is found, use the existing record instead of creating a new one.</li>
</ul>

<h3>Tips</h3>
<ul>
  <li>Always include an area code with phone numbers (e.g., 904-555-1234).</li>
  <li>Use the contact''s preferred email address for notifications.</li>
  <li>Mark internal-only information using the <strong>Internal</strong> note type so it is clearly labeled.</li>
</ul>',
  'Step-by-step instructions for adding, editing, and managing contacts in the Linksy portal.',
  'How-To Guides',
  'user',
  true,
  20
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 3. Intake Specialists — Team Management Instructions
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Managing Intake Specialists',
  'managing-intake-specialists',
  '<h2>Managing Intake Specialists</h2>
<p>Intake Specialists are the staff members at your organization who receive and process incoming referrals. This guide covers how to add, manage, and remove Intake Specialists from your team.</p>

<h3>What Is an Intake Specialist?</h3>
<p>An <strong>Intake Specialist</strong> is a provider team member responsible for handling incoming referrals. When a community member submits a referral to your organization, your Intake Specialists receive an email notification and can view, respond to, and update the referral in the portal.</p>
<p><em>Note: In earlier versions of the portal, Intake Specialists were referred to as "staff members." The functionality is the same — only the terminology has been updated.</em></p>

<h3>Adding an Intake Specialist</h3>
<ol>
  <li>Navigate to <strong>My Organization</strong> in the dashboard sidebar.</li>
  <li>Select the <strong>Team</strong> tab.</li>
  <li>Click <strong>Add Team Member</strong> (or <strong>Invite Member</strong>).</li>
  <li>Enter the person''s email address. They must have an existing portal account, or they will receive an invitation to create one.</li>
  <li>Select a role:
    <ul>
      <li><strong>Admin</strong> — Can manage the team, edit organization settings, and handle all referrals</li>
      <li><strong>User</strong> — Can view and respond to referrals but cannot manage team settings</li>
    </ul>
  </li>
  <li>Click <strong>Save</strong> or <strong>Send Invitation</strong>.</li>
</ol>

<h3>Changing an Intake Specialist''s Role</h3>
<ol>
  <li>Go to <strong>My Organization → Team</strong>.</li>
  <li>Find the team member in the list.</li>
  <li>Click the <strong>Edit</strong> button next to their name.</li>
  <li>Change their role between Admin and User.</li>
  <li>Save the changes.</li>
</ol>

<h3>Removing an Intake Specialist</h3>
<ol>
  <li>Go to <strong>My Organization → Team</strong>.</li>
  <li>Find the team member you want to remove.</li>
  <li>Click the <strong>Remove</strong> button.</li>
  <li>Confirm the removal when prompted.</li>
</ol>
<p><strong>Important:</strong> Removing an Intake Specialist does not delete their portal account — it only removes their association with your provider organization. They will no longer receive referral notifications or have access to your organization''s referrals.</p>

<h3>Best Practices</h3>
<ul>
  <li>Ensure at least one Intake Specialist has the <strong>Admin</strong> role so team management is always possible.</li>
  <li>Review your team list regularly and remove anyone who has left the organization.</li>
  <li>When an Intake Specialist goes on extended leave, consider temporarily reassigning their referrals to another team member.</li>
</ul>',
  'How to add, manage, and remove Intake Specialists (team members) who handle incoming referrals for your organization.',
  'How-To Guides',
  'provider_employee',
  true,
  30
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 4. Referral Lifecycle Statuses
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Referral Lifecycle & Statuses',
  'referral-lifecycle-statuses',
  '<h2>Referral Lifecycle &amp; Statuses</h2>
<p>Every referral in Linksy moves through a series of statuses that track its progress from submission to resolution. This guide explains each status and when to use it.</p>

<h3>Status Overview</h3>
<table>
  <thead>
    <tr><th>Status</th><th>Description</th><th>When to Use</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Pending</strong></td>
      <td>The referral has been submitted but not yet reviewed.</td>
      <td>Automatically set when a referral is first created. No action needed.</td>
    </tr>
    <tr>
      <td><strong>In Process</strong></td>
      <td>The referral is actively being worked on by the provider.</td>
      <td>Set this status when you begin working with the client — e.g., you have made initial contact, scheduled an appointment, or started intake procedures.</td>
    </tr>
    <tr>
      <td><strong>Service Provided</strong></td>
      <td>The client''s need has been addressed.</td>
      <td>Set this when you have successfully provided the requested service or connected the client with the appropriate resource.</td>
    </tr>
    <tr>
      <td><strong>Transferred</strong></td>
      <td>The referral has been transferred to a different provider.</td>
      <td>Use this when your organization cannot serve the client and you forward the referral to another provider who can help. The receiving provider will see the referral as "Transferred Pending."</td>
    </tr>
    <tr>
      <td><strong>Transferred Pending</strong></td>
      <td>A referral that was transferred to your organization and is awaiting your review.</td>
      <td>This status is automatically set when another provider transfers a referral to you. Update it to "In Process" once you begin working on it.</td>
    </tr>
    <tr>
      <td><strong>Wrong Org Referred</strong></td>
      <td>The client was referred to the wrong organization.</td>
      <td>Use this when the client''s need does not match the services your organization provides. Consider transferring the referral to the correct provider instead.</td>
    </tr>
    <tr>
      <td><strong>Out of Scope</strong></td>
      <td>The request is outside the scope of services available.</td>
      <td>Use this when the client''s need falls outside what any provider in the network currently offers.</td>
    </tr>
    <tr>
      <td><strong>Not Eligible</strong></td>
      <td>The client does not meet eligibility requirements.</td>
      <td>Use this when the client does not qualify for the requested service due to eligibility criteria (e.g., income level, geographic area, age).</td>
    </tr>
    <tr>
      <td><strong>Unable to Assist</strong></td>
      <td>The provider was unable to assist the client for other reasons.</td>
      <td>Use this as a catch-all when none of the other resolution statuses apply.</td>
    </tr>
    <tr>
      <td><strong>Unresponsive</strong></td>
      <td>The client has not responded to outreach attempts.</td>
      <td>Use this when you have made multiple attempts to contact the client (phone, email) with no response. Document your outreach attempts in the referral comments.</td>
    </tr>
  </tbody>
</table>

<h3>Typical Referral Flow</h3>
<ol>
  <li><strong>Pending</strong> → A new referral arrives</li>
  <li><strong>In Process</strong> → You begin working with the client</li>
  <li><strong>Service Provided</strong> → The client''s need is addressed</li>
</ol>
<p>Alternative paths:</p>
<ul>
  <li><strong>Pending → Transferred</strong> → The referral is forwarded to a more appropriate provider</li>
  <li><strong>Transferred Pending → In Process → Service Provided</strong> → A transferred referral is picked up and resolved</li>
  <li><strong>In Process → Unresponsive</strong> → The client stops responding</li>
  <li><strong>Pending → Wrong Org Referred</strong> → Immediately identified as incorrect</li>
</ul>

<h3>Tips for Status Management</h3>
<ul>
  <li>Always move a referral to <strong>In Process</strong> as soon as you begin working on it. This lets administrators see that the referral is being handled.</li>
  <li>Add a <strong>comment</strong> whenever you change a status to explain why, especially for resolution statuses.</li>
  <li>Use <strong>Transfer</strong> instead of "Wrong Org Referred" when you know which provider should handle the referral — it saves the client from having to resubmit.</li>
  <li>When marking as <strong>Unresponsive</strong>, document your outreach attempts (dates, methods) in the comments.</li>
</ul>',
  'Complete guide to referral statuses including In Process, Transferred, Transferred Pending, and all resolution statuses.',
  'Reference',
  'user',
  true,
  40
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- 5. Creating a Referral (with zip code instructions)
INSERT INTO public.linksy_docs (title, slug, content, excerpt, category, min_role, is_published, sort_order)
VALUES (
  'Creating a Referral',
  'creating-a-referral',
  '<h2>Creating a Referral</h2>
<p>This guide walks you through the process of creating a new referral in Linksy, from searching for services to submitting the referral request.</p>

<h3>Step 1: Search for Services</h3>
<ol>
  <li>Navigate to the <strong>Find Help</strong> page (or use the embedded widget on your organization''s website).</li>
  <li>Type a description of the client''s need in the search bar. Use natural language — for example, "need help paying rent" or "food pantry near me."</li>
  <li><strong>Enter a ZIP code</strong> to narrow results to providers serving that area:
    <ul>
      <li>Click the <strong>location pin</strong> icon next to the search bar.</li>
      <li>You can either allow the browser to detect your location automatically, or click <strong>"Enter ZIP code"</strong> to type one manually.</li>
      <li>Enter the client''s ZIP code (e.g., 32043) and click <strong>Set</strong>.</li>
      <li>The search will filter out providers whose service area does not include that ZIP code. Providers with no ZIP code restrictions will still appear.</li>
    </ul>
  </li>
  <li>Review the search results. Each result shows the provider name, matching services, and distance (if location was provided).</li>
</ol>

<h3>Step 2: Select a Provider &amp; Service</h3>
<ol>
  <li>Click on a provider from the search results to view their details.</li>
  <li>Review the provider''s services, locations, and contact information.</li>
  <li>Click <strong>Request Referral</strong> (or <strong>Submit Referral</strong>) on the service that matches the client''s need.</li>
</ol>

<h3>Step 3: Fill Out the Referral Form</h3>
<p>The referral form collects the following information:</p>
<ul>
  <li><strong>Client Name</strong> (optional) — The client can choose to remain anonymous.</li>
  <li><strong>Phone Number</strong> (required if no email) — Include the area code. The provider will use this to follow up.</li>
  <li><strong>Email Address</strong> (required if no phone) — An alternative contact method.</li>
  <li><strong>Additional Details</strong> (optional) — Any extra context about the client''s situation or needs.</li>
</ul>
<p>Some host organizations may have additional custom fields (e.g., date of birth, household size). Fill these in if they appear on the form.</p>

<h3>Step 4: Submit</h3>
<ol>
  <li>Review the information you entered.</li>
  <li>Click <strong>Submit Request</strong>.</li>
  <li>You will receive a <strong>reference number</strong> (e.g., R-2001-07). Save this number for your records.</li>
  <li>The provider''s Intake Specialists will receive an email notification about the new referral.</li>
</ol>

<h3>After Submission</h3>
<p>Once submitted, the referral enters the <strong>Pending</strong> status. The provider''s Intake Specialists will review it and update the status as they work with the client. You can track the referral''s progress in the <strong>Referrals</strong> section of the dashboard.</p>

<h3>Tips</h3>
<ul>
  <li><strong>Always enter a ZIP code</strong> when creating a referral — it helps match the client with providers who serve their area.</li>
  <li>Either a phone number or email address is required. Providing both gives the provider more options for follow-up.</li>
  <li>Use the <strong>Additional Details</strong> field to note any time-sensitive information or special circumstances.</li>
  <li>If the search doesn''t return relevant results, try different wording or broaden your search terms.</li>
</ul>',
  'Step-by-step guide to searching for services, entering a ZIP code, and submitting a referral request.',
  'How-To Guides',
  'user',
  true,
  15
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  excerpt = EXCLUDED.excerpt,
  category = EXCLUDED.category,
  min_role = EXCLUDED.min_role,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

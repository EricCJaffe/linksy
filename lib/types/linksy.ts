// Linksy domain types

// Crisis detection
export type CrisisType = 'suicide' | 'domestic_violence' | 'trafficking' | 'child_abuse'
export type CrisisSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface EmergencyResource {
  name: string
  phone: string
  url: string
  description: string
}

export interface CrisisKeyword {
  id: string
  site_id: string
  keyword: string
  crisis_type: CrisisType
  severity: CrisisSeverity
  response_template: string | null
  emergency_resources: EmergencyResource[]
  is_active: boolean
  created_at: string
}

export interface CrisisCheckResult {
  crisis_type: CrisisType
  severity: CrisisSeverity
  response_template: string | null
  emergency_resources: EmergencyResource[]
  matched_keyword: string
}

// Enum type unions
export type Sector = 'nonprofit' | 'faith_based' | 'government' | 'business'
export type ProjectStatus = 'active' | 'sustaining' | 'maintenance' | 'na'
export type ReferralType = 'standard' | 'contact_directly'
export type ProviderContactMethod = 'all' | 'email' | 'phone' | 'fax' | 'mail'
export type TicketStatus =
  | 'pending'
  | 'customer_need_addressed'
  | 'wrong_organization_referred'
  | 'outside_of_scope'
  | 'client_not_eligible'
  | 'unable_to_assist'
  | 'client_unresponsive'
export type ProviderStatusEnum = 'active' | 'paused' | 'inactive' | 'pending_approval'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'
export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type NoteType = 'general' | 'outreach' | 'update' | 'internal' | 'call_log'
export type CallOutcome = 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'disconnected' | 'wrong_number'
export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type SupportTicketCategory = 'technical' | 'account' | 'billing' | 'feature_request' | 'other'

// Core entities
export interface HostWidgetConfig {
  welcome_message?: string
  primary_color?: string
  secondary_color?: string
  header_bg_color?: string
  font_family?: string
  logo_url?: string
  bot_name?: string
  search_radius_miles?: number
  search_rate_limit_per_minute?: number
  ticket_rate_limit_per_hour?: number
}

export interface Provider {
  id: string
  name: string
  slug: string
  description: string | null
  sector: Sector
  phone: string | null
  phone_extension: string | null
  email: string | null
  website: string | null
  hours: string | null
  is_active: boolean
  provider_status: ProviderStatusEnum
  accepting_referrals: boolean
  referral_type: ReferralType
  referral_instructions: string | null
  contact_method?: ProviderContactMethod
  allow_contact_email?: boolean
  allow_follow_email?: boolean
  allow_bulk_email?: boolean
  allow_contact_phone?: boolean
  allow_contact_fax?: boolean
  allow_contact_mail?: boolean
  project_status: ProjectStatus
  allow_auto_update: boolean
  social_facebook: string | null
  social_instagram: string | null
  social_twitter: string | null
  social_linkedin: string | null
  service_zip_codes: string[] | null
  legacy_id: string | null
  legacy_referral_count: number | null
  imported_at: string | null
  import_source: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  parent_provider_id: string | null
  parent_linked_by: string | null
  parent_linked_at: string | null
  created_at: string
  updated_at: string
  // Host fields
  is_host: boolean
  host_embed_active: boolean
  host_widget_config: HostWidgetConfig
  host_allowed_domains: string[] | null
  host_tokens_used_this_month: number
  host_searches_this_month: number
  host_monthly_token_budget: number | null
  host_usage_reset_at: string | null
  // AI / search
  llm_context_card: string | null
  // Aggregated counts from list query
  location_count?: number
  need_count?: number
}

export interface ProviderLocation {
  id: string
  provider_id: string
  name: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  phone: string | null
  is_primary: boolean
  latitude: number | null
  longitude: number | null
  geocoded_at: string | null
  created_at: string
}

export interface ProviderNeed {
  id: string
  provider_id: string
  need_id: string
  source: 'manual' | 'referral_derived' | 'ai_suggested'
  is_confirmed: boolean
  need?: Need
}

export interface NoteAttachment {
  name: string
  url: string
  size: number
  type: string
}

export interface CallLogData {
  duration_minutes?: number
  call_outcome: CallOutcome
  caller_name?: string
  caller_phone?: string
  caller_email?: string
  follow_up_required?: boolean
  follow_up_date?: string
}

export interface ProviderNote {
  id: string
  provider_id: string
  user_id: string | null
  note_type: NoteType
  is_private: boolean
  is_pinned?: boolean
  content: string
  call_log_data?: CallLogData | null
  attachments?: NoteAttachment[]
  created_at: string
  user?: { full_name: string | null; email: string }
}

export type ProviderContactRole = 'admin' | 'user'
export type ProviderContactStatus = 'active' | 'archived' | 'invited'

export interface ProviderContact {
  id: string
  provider_id: string
  user_id: string | null
  job_title: string | null
  contact_type: string | null
  phone: string | null
  provider_role: ProviderContactRole
  status: ProviderContactStatus
  is_primary_contact: boolean
  is_default_referral_handler: boolean
  invitation_sent_at: string | null
  invitation_accepted_at: string | null
  created_at: string
  user?: { full_name: string | null; email: string }
}

export interface ProviderEvent {
  id: string
  provider_id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  status: EventStatus
  is_public: boolean
  recurrence_rule: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  approved_by: string | null
  approved_at: string | null
  provider?: { name: string }
  creator?: { full_name: string | null; email: string }
  approver?: { full_name: string | null; email: string }
}

export interface NeedCategory {
  id: string
  name: string
  slug: string
  description: string | null
  sort_order: number
  airs_code: string | null
  is_active: boolean
  needs?: Need[]
}

export interface Need {
  id: string
  category_id: string
  name: string
  synonyms: string[] | null
  is_active: boolean
  category?: NeedCategory
}

export interface Ticket {
  id: string
  site_id: string
  ticket_number: string
  provider_id: string | null
  need_id: string | null
  client_user_id: string | null
  client_name: string | null
  client_phone: string | null
  client_email: string | null
  description_of_need: string | null
  status: TicketStatus
  client_perception: string | null
  follow_up_sent: boolean | null
  source: string | null
  search_session_id: string | null
  sla_due_at: string | null
  custom_data?: Record<string, any>
  // Assignment tracking
  assigned_to: string | null
  assigned_at: string | null
  reassignment_count: number
  last_reassigned_at: string | null
  forwarded_from_provider_id: string | null
  created_at: string
  updated_at: string
  need?: Need
  provider?: { name: string }
  comments?: TicketComment[]
}

export interface TicketComment {
  id: string
  ticket_id: string
  author_id: string | null
  content: string
  is_private: boolean | null
  author_name: string | null
  author_role: string | null
  created_at: string
}

// Ticket event types for reassignment audit trail
export type TicketEventType =
  | 'created'
  | 'assigned'
  | 'reassigned'
  | 'forwarded'
  | 'status_changed'
  | 'comment_added'
  | 'updated'

export type ReassignmentReason =
  | 'unable_to_assist'
  | 'wrong_org'
  | 'capacity'
  | 'other'
  | 'admin_reassignment'
  | 'internal_assignment'

export type ActorType = 'site_admin' | 'provider_admin' | 'provider_contact' | 'system'

export interface TicketEvent {
  id: string
  ticket_id: string
  event_type: TicketEventType
  actor_id: string | null
  actor_type: ActorType | null
  previous_state: Record<string, any> | null
  new_state: Record<string, any> | null
  reason: ReassignmentReason | null
  notes: string | null
  metadata: Record<string, any>
  created_at: string
  actor?: { full_name: string | null; email: string }
}

export interface ReassignmentStats {
  total_reassignments: number
  provider_initiated: number
  admin_initiated: number
  average_reassignments_per_ticket: number
  top_forwarding_providers: Array<{
    provider_id: string
    provider_name: string
    forward_count: number
  }>
  top_receiving_providers: Array<{
    provider_id: string
    provider_name: string
    receive_count: number
  }>
  reason_breakdown: Record<ReassignmentReason, number>
}

export interface TicketFilters {
  q?: string
  status?: TicketStatus | 'all'
  provider_id?: string
  need_id?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  status: SupportTicketStatus
  priority: SupportTicketPriority
  category: SupportTicketCategory | null
  submitter_id: string | null
  submitter_name: string | null
  submitter_email: string | null
  provider_id: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  provider?: { name: string }
  comments?: SupportTicketComment[]
}

export interface SupportTicketComment {
  id: string
  ticket_id: string
  author_id: string | null
  author_name: string | null
  content: string
  is_internal: boolean
  created_at: string
}

// Detail view (provider with all relations)
export interface ProviderDetail extends Provider {
  locations: ProviderLocation[]
  provider_needs: ProviderNeed[]
  notes: ProviderNote[]
  tickets: Ticket[]
  contacts: ProviderContact[]
  events: ProviderEvent[]
}

// Parent/Child Organization Hierarchy
export interface ProviderHierarchy {
  provider: Provider
  parent: Provider | null
  children: Provider[]
}

// Parent Organization Aggregated Stats
export interface ParentOrgStats {
  parent_id: string
  parent_name: string
  total_children: number
  aggregated_metrics: {
    total_referrals: number
    open_referrals: number
    closed_referrals: number
    total_interactions: number
    total_events: number
    upcoming_events: number
    total_notes: number
    total_locations: number
    combined_analytics: {
      profile_views: number
      phone_clicks: number
      website_clicks: number
      directions_clicks: number
    }
  }
  parent_stats: any
  children_stats: Array<{
    provider_id: string
    provider_name: string
    provider_status: ProviderStatusEnum
    is_active: boolean
    referral_count: number
    open_referrals: number
    closed_referrals: number
    interaction_count: number
    profile_views: number
    phone_clicks: number
    website_clicks: number
    directions_clicks: number
    event_count: number
    note_count: number
    location_count: number
  }>
}

// Provider access level (for parent/child scenarios)
export type ProviderAccessLevel = 'self' | 'parent_admin' | 'site_admin'

export interface ProviderAccessInfo {
  hasAccess: boolean
  accessLevel: ProviderAccessLevel
  accessibleProviderIds: string[]
}

// Documentation / Knowledge Base
export type DocRole = 'user' | 'provider_employee' | 'tenant_admin' | 'site_admin'

export interface Doc {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  category: string
  min_role: DocRole
  is_published: boolean
  sort_order: number
  author_id: string | null
  created_at: string
  updated_at: string
}

// Provider Applications
export interface ProviderApplication {
  id: string
  org_name: string
  sector: string | null
  description: string | null
  services: string | null
  website: string | null
  phone: string | null
  hours: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  contact_name: string
  contact_email: string
  contact_phone: string | null
  status: ApplicationStatus
  reviewer_id: string | null
  reviewed_at: string | null
  reviewer_notes: string | null
  created_provider_id: string | null
  created_at: string
  updated_at: string
}

// Call logs
export type CallType = 'inbound' | 'outbound'

export interface CallLog {
  id: string
  ticket_id: string | null
  provider_id: string | null
  caller_name: string | null
  call_type: CallType
  duration_minutes: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  creator?: { full_name: string | null; email: string }
}

// Surveys
export interface Survey {
  id: string
  ticket_id: string | null
  token: string
  client_email: string | null
  rating: number | null
  feedback_text: string | null
  completed_at: string | null
  created_at: string
}

// Email templates
export interface EmailTemplate {
  id: string
  slug: string
  name: string
  subject: string
  body_html: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// Custom fields for dynamic intake forms
export type CustomFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'email' | 'phone'

export interface CustomField {
  id: string
  provider_id: string
  field_label: string
  field_type: CustomFieldType
  options: string[]
  is_required: boolean
  sort_order: number
  created_at: string
}

// Host custom fields for white-label intake forms
export interface HostCustomField {
  id: string
  host_id: string
  field_label: string
  field_type: CustomFieldType
  field_options: string[]
  placeholder: string | null
  help_text: string | null
  is_required: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

// Host email templates for white-label branding
export interface HostEmailTemplate {
  id: string
  host_id: string
  template_key: string
  name: string
  subject: string
  body_html: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

// Filter params for provider list
export interface ProviderFilters {
  q?: string
  sector?: Sector | 'all'
  status?: 'active' | 'inactive' | 'paused' | 'all'
  referral_type?: ReferralType | 'all'
  organization_type?: 'all' | 'parent' | 'child' | 'standalone'
  limit?: number
  offset?: number
}

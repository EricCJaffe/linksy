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
export type TicketStatus =
  | 'pending'
  | 'customer_need_addressed'
  | 'wrong_organization_referred'
  | 'outside_of_scope'
  | 'client_not_eligible'
  | 'unable_to_assist'
  | 'client_unresponsive'
export type EventStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type NoteType = 'general' | 'outreach' | 'update' | 'internal'
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
}

export interface Provider {
  id: string
  name: string
  slug: string
  description: string | null
  sector: Sector
  phone: string | null
  email: string | null
  website: string | null
  hours: string | null
  is_active: boolean
  referral_type: ReferralType
  referral_instructions: string | null
  project_status: ProjectStatus
  allow_auto_update: boolean
  social_facebook: string | null
  social_instagram: string | null
  social_twitter: string | null
  social_linkedin: string | null
  legacy_id: string | null
  legacy_referral_count: number | null
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

export interface ProviderNote {
  id: string
  provider_id: string
  user_id: string | null
  note_type: NoteType
  is_private: boolean
  content: string
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

// Filter params for provider list
export interface ProviderFilters {
  q?: string
  sector?: Sector | 'all'
  status?: 'active' | 'inactive' | 'all'
  referral_type?: ReferralType | 'all'
  limit?: number
  offset?: number
}

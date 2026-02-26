drop extension if exists "pg_net";

create extension if not exists "btree_gin" with schema "public";

create type "public"."api_key_status" as enum ('active', 'revoked', 'expired');

create type "public"."billing_period" as enum ('monthly', 'yearly');

create type "public"."custom_field_type" as enum ('text', 'number', 'date', 'dropdown', 'checkbox', 'file');

create type "public"."email_frequency" as enum ('instant', 'daily_digest', 'off');

create type "public"."entity_type" as enum ('user', 'location', 'module_data');

create type "public"."feature_flag_type" as enum ('boolean', 'rollout_percentage', 'tenant_whitelist');

create type "public"."invoice_status" as enum ('draft', 'open', 'paid', 'void', 'uncollectible');

create type "public"."job_status" as enum ('pending', 'running', 'completed', 'failed');

create type "public"."subscription_status" as enum ('trial', 'active', 'past_due', 'cancelled');

create type "public"."tenant_status" as enum ('trial', 'active', 'suspended', 'cancelled', 'archived');

create type "public"."tenant_type" as enum ('enterprise', 'nonprofit', 'church', 'individual', 'other');

create type "public"."theme_preference" as enum ('light', 'dark', 'system');

create type "public"."webhook_delivery_status" as enum ('pending', 'delivered', 'failed');

drop trigger if exists "update_linksy_email_templates_updated_at" on "public"."linksy_email_templates";

drop trigger if exists "update_host_custom_fields_updated_at" on "public"."linksy_host_custom_fields";

drop trigger if exists "update_host_email_templates_updated_at" on "public"."linksy_host_email_templates";

drop trigger if exists "ticket_status_change_trigger" on "public"."linksy_tickets";

drop trigger if exists "update_linksy_webhooks_updated_at" on "public"."linksy_webhooks";

drop trigger if exists "update_sites_updated_at" on "public"."sites";

drop policy "Tenant admins can view their tenant audit logs" on "public"."audit_logs";

drop policy "Tenant admins can delete any file in their tenant" on "public"."files";

drop policy "Users can delete their own files" on "public"."files";

drop policy "Users can upload files to their tenants" on "public"."files";

drop policy "Users can view files in their tenants" on "public"."files";

drop policy "Tenant admins can create invitations" on "public"."invitations";

drop policy "Tenant admins can delete invitations" on "public"."invitations";

drop policy "Tenant admins can view their invitations" on "public"."invitations";

drop policy "Anyone can read active host custom fields" on "public"."linksy_host_custom_fields";

drop policy "Host admins can manage their own custom fields" on "public"."linksy_host_custom_fields";

drop policy "Site admins can manage all host custom fields" on "public"."linksy_host_custom_fields";

drop policy "Host admins can manage their own email templates" on "public"."linksy_host_email_templates";

drop policy "Site admins can manage all host email templates" on "public"."linksy_host_email_templates";

drop policy "Provider contacts can view their ticket events" on "public"."linksy_ticket_events";

drop policy "Service role can insert events" on "public"."linksy_ticket_events";

drop policy "Site admins can view all ticket events" on "public"."linksy_ticket_events";

drop policy "Admins can view webhook deliveries" on "public"."linksy_webhook_deliveries";

drop policy "System can create webhook deliveries" on "public"."linksy_webhook_deliveries";

drop policy "Admins can create tenant webhooks" on "public"."linksy_webhooks";

drop policy "Admins can delete tenant webhooks" on "public"."linksy_webhooks";

drop policy "Admins can update tenant webhooks" on "public"."linksy_webhooks";

drop policy "Admins can view tenant webhooks" on "public"."linksy_webhooks";

drop policy "Users can update their own notifications" on "public"."notifications";

drop policy "Users can view their own notifications" on "public"."notifications";

drop policy "Tenant admins can manage their tenant modules" on "public"."tenant_modules";

drop policy "Tenant admins can manage their tenant memberships" on "public"."tenant_users";

drop policy "Tenant admins can view their tenant memberships" on "public"."tenant_users";

drop policy "Users can view their own memberships" on "public"."tenant_users";

drop policy "Tenant admins can update their tenant" on "public"."tenants";

drop policy "Users can view other users in their tenants" on "public"."users";

revoke delete on table "public"."linksy_host_custom_fields" from "anon";

revoke insert on table "public"."linksy_host_custom_fields" from "anon";

revoke references on table "public"."linksy_host_custom_fields" from "anon";

revoke select on table "public"."linksy_host_custom_fields" from "anon";

revoke trigger on table "public"."linksy_host_custom_fields" from "anon";

revoke truncate on table "public"."linksy_host_custom_fields" from "anon";

revoke update on table "public"."linksy_host_custom_fields" from "anon";

revoke delete on table "public"."linksy_host_custom_fields" from "authenticated";

revoke insert on table "public"."linksy_host_custom_fields" from "authenticated";

revoke references on table "public"."linksy_host_custom_fields" from "authenticated";

revoke select on table "public"."linksy_host_custom_fields" from "authenticated";

revoke trigger on table "public"."linksy_host_custom_fields" from "authenticated";

revoke truncate on table "public"."linksy_host_custom_fields" from "authenticated";

revoke update on table "public"."linksy_host_custom_fields" from "authenticated";

revoke delete on table "public"."linksy_host_custom_fields" from "service_role";

revoke insert on table "public"."linksy_host_custom_fields" from "service_role";

revoke references on table "public"."linksy_host_custom_fields" from "service_role";

revoke select on table "public"."linksy_host_custom_fields" from "service_role";

revoke trigger on table "public"."linksy_host_custom_fields" from "service_role";

revoke truncate on table "public"."linksy_host_custom_fields" from "service_role";

revoke update on table "public"."linksy_host_custom_fields" from "service_role";

revoke delete on table "public"."linksy_host_email_templates" from "anon";

revoke insert on table "public"."linksy_host_email_templates" from "anon";

revoke references on table "public"."linksy_host_email_templates" from "anon";

revoke select on table "public"."linksy_host_email_templates" from "anon";

revoke trigger on table "public"."linksy_host_email_templates" from "anon";

revoke truncate on table "public"."linksy_host_email_templates" from "anon";

revoke update on table "public"."linksy_host_email_templates" from "anon";

revoke delete on table "public"."linksy_host_email_templates" from "authenticated";

revoke insert on table "public"."linksy_host_email_templates" from "authenticated";

revoke references on table "public"."linksy_host_email_templates" from "authenticated";

revoke select on table "public"."linksy_host_email_templates" from "authenticated";

revoke trigger on table "public"."linksy_host_email_templates" from "authenticated";

revoke truncate on table "public"."linksy_host_email_templates" from "authenticated";

revoke update on table "public"."linksy_host_email_templates" from "authenticated";

revoke delete on table "public"."linksy_host_email_templates" from "service_role";

revoke insert on table "public"."linksy_host_email_templates" from "service_role";

revoke references on table "public"."linksy_host_email_templates" from "service_role";

revoke select on table "public"."linksy_host_email_templates" from "service_role";

revoke trigger on table "public"."linksy_host_email_templates" from "service_role";

revoke truncate on table "public"."linksy_host_email_templates" from "service_role";

revoke update on table "public"."linksy_host_email_templates" from "service_role";

revoke delete on table "public"."linksy_ticket_events" from "anon";

revoke insert on table "public"."linksy_ticket_events" from "anon";

revoke references on table "public"."linksy_ticket_events" from "anon";

revoke select on table "public"."linksy_ticket_events" from "anon";

revoke trigger on table "public"."linksy_ticket_events" from "anon";

revoke truncate on table "public"."linksy_ticket_events" from "anon";

revoke update on table "public"."linksy_ticket_events" from "anon";

revoke delete on table "public"."linksy_ticket_events" from "authenticated";

revoke insert on table "public"."linksy_ticket_events" from "authenticated";

revoke references on table "public"."linksy_ticket_events" from "authenticated";

revoke select on table "public"."linksy_ticket_events" from "authenticated";

revoke trigger on table "public"."linksy_ticket_events" from "authenticated";

revoke truncate on table "public"."linksy_ticket_events" from "authenticated";

revoke update on table "public"."linksy_ticket_events" from "authenticated";

revoke delete on table "public"."linksy_ticket_events" from "service_role";

revoke insert on table "public"."linksy_ticket_events" from "service_role";

revoke references on table "public"."linksy_ticket_events" from "service_role";

revoke select on table "public"."linksy_ticket_events" from "service_role";

revoke trigger on table "public"."linksy_ticket_events" from "service_role";

revoke truncate on table "public"."linksy_ticket_events" from "service_role";

revoke update on table "public"."linksy_ticket_events" from "service_role";

revoke delete on table "public"."linksy_webhook_deliveries" from "anon";

revoke insert on table "public"."linksy_webhook_deliveries" from "anon";

revoke references on table "public"."linksy_webhook_deliveries" from "anon";

revoke select on table "public"."linksy_webhook_deliveries" from "anon";

revoke trigger on table "public"."linksy_webhook_deliveries" from "anon";

revoke truncate on table "public"."linksy_webhook_deliveries" from "anon";

revoke update on table "public"."linksy_webhook_deliveries" from "anon";

revoke delete on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke insert on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke references on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke select on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke trigger on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke truncate on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke update on table "public"."linksy_webhook_deliveries" from "authenticated";

revoke delete on table "public"."linksy_webhook_deliveries" from "service_role";

revoke insert on table "public"."linksy_webhook_deliveries" from "service_role";

revoke references on table "public"."linksy_webhook_deliveries" from "service_role";

revoke select on table "public"."linksy_webhook_deliveries" from "service_role";

revoke trigger on table "public"."linksy_webhook_deliveries" from "service_role";

revoke truncate on table "public"."linksy_webhook_deliveries" from "service_role";

revoke update on table "public"."linksy_webhook_deliveries" from "service_role";

revoke delete on table "public"."linksy_webhooks" from "anon";

revoke insert on table "public"."linksy_webhooks" from "anon";

revoke references on table "public"."linksy_webhooks" from "anon";

revoke select on table "public"."linksy_webhooks" from "anon";

revoke trigger on table "public"."linksy_webhooks" from "anon";

revoke truncate on table "public"."linksy_webhooks" from "anon";

revoke update on table "public"."linksy_webhooks" from "anon";

revoke delete on table "public"."linksy_webhooks" from "authenticated";

revoke insert on table "public"."linksy_webhooks" from "authenticated";

revoke references on table "public"."linksy_webhooks" from "authenticated";

revoke select on table "public"."linksy_webhooks" from "authenticated";

revoke trigger on table "public"."linksy_webhooks" from "authenticated";

revoke truncate on table "public"."linksy_webhooks" from "authenticated";

revoke update on table "public"."linksy_webhooks" from "authenticated";

revoke delete on table "public"."linksy_webhooks" from "service_role";

revoke insert on table "public"."linksy_webhooks" from "service_role";

revoke references on table "public"."linksy_webhooks" from "service_role";

revoke select on table "public"."linksy_webhooks" from "service_role";

revoke trigger on table "public"."linksy_webhooks" from "service_role";

revoke truncate on table "public"."linksy_webhooks" from "service_role";

revoke update on table "public"."linksy_webhooks" from "service_role";

alter table "public"."linksy_host_custom_fields" drop constraint "linksy_host_custom_fields_created_by_fkey";

alter table "public"."linksy_host_custom_fields" drop constraint "linksy_host_custom_fields_field_type_check";

alter table "public"."linksy_host_custom_fields" drop constraint "linksy_host_custom_fields_host_id_fkey";

alter table "public"."linksy_host_email_templates" drop constraint "linksy_host_email_templates_created_by_fkey";

alter table "public"."linksy_host_email_templates" drop constraint "linksy_host_email_templates_host_id_fkey";

alter table "public"."linksy_host_email_templates" drop constraint "linksy_host_email_templates_host_id_template_key_key";

alter table "public"."linksy_providers" drop constraint "linksy_providers_tenant_id_fkey";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_actor_id_fkey";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_actor_type_check";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_event_type_check";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_reason_check";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_ticket_id_fkey";

alter table "public"."linksy_tickets" drop constraint "linksy_tickets_assigned_to_fkey";

alter table "public"."linksy_tickets" drop constraint "linksy_tickets_forwarded_from_provider_id_fkey";

alter table "public"."linksy_webhook_deliveries" drop constraint "linksy_webhook_deliveries_webhook_id_fkey";

alter table "public"."linksy_webhooks" drop constraint "linksy_webhooks_created_by_fkey";

alter table "public"."linksy_webhooks" drop constraint "linksy_webhooks_tenant_id_fkey";

alter table "public"."sites" drop constraint "sites_slug_key";

alter table "public"."linksy_provider_contacts" drop constraint "linksy_provider_contacts_status_check";

drop function if exists "public"."linksy_record_ticket_event"(p_ticket_id uuid, p_event_type text, p_actor_id uuid, p_actor_type text, p_previous_state jsonb, p_new_state jsonb, p_reason text, p_notes text, p_metadata jsonb);

drop function if exists "public"."linksy_ticket_status_change_trigger"();

alter table "public"."linksy_host_custom_fields" drop constraint "linksy_host_custom_fields_pkey";

alter table "public"."linksy_host_email_templates" drop constraint "linksy_host_email_templates_pkey";

alter table "public"."linksy_ticket_events" drop constraint "linksy_ticket_events_pkey";

alter table "public"."linksy_webhook_deliveries" drop constraint "linksy_webhook_deliveries_pkey";

alter table "public"."linksy_webhooks" drop constraint "linksy_webhooks_pkey";

drop index if exists "public"."idx_audit_logs_created_at";

drop index if exists "public"."idx_host_custom_fields_host_active";

drop index if exists "public"."idx_host_email_templates_host_key";

drop index if exists "public"."idx_invitations_email";

drop index if exists "public"."idx_linksy_email_templates_active";

drop index if exists "public"."idx_linksy_webhook_deliveries_created_at";

drop index if exists "public"."idx_linksy_webhook_deliveries_success";

drop index if exists "public"."idx_linksy_webhook_deliveries_webhook_id";

drop index if exists "public"."idx_linksy_webhooks_is_active";

drop index if exists "public"."idx_linksy_webhooks_tenant_id";

drop index if exists "public"."idx_providers_tenant_id";

drop index if exists "public"."idx_ticket_events_actor_id";

drop index if exists "public"."idx_ticket_events_created_at";

drop index if exists "public"."idx_ticket_events_event_type";

drop index if exists "public"."idx_ticket_events_ticket_id";

drop index if exists "public"."idx_tickets_assigned_to";

drop index if exists "public"."idx_tickets_custom_data";

drop index if exists "public"."idx_tickets_forwarded_from";

drop index if exists "public"."idx_tickets_reassignment_count";

drop index if exists "public"."linksy_host_custom_fields_pkey";

drop index if exists "public"."linksy_host_email_templates_host_id_template_key_key";

drop index if exists "public"."linksy_host_email_templates_pkey";

drop index if exists "public"."linksy_ticket_events_pkey";

drop index if exists "public"."linksy_webhook_deliveries_pkey";

drop index if exists "public"."linksy_webhooks_pkey";

drop index if exists "public"."sites_slug_key";

drop table "public"."linksy_host_custom_fields";

drop table "public"."linksy_host_email_templates";

drop table "public"."linksy_ticket_events";

drop table "public"."linksy_webhook_deliveries";

drop table "public"."linksy_webhooks";

alter table "public"."linksy_provider_contacts" alter column "contact_type" drop default;

alter type "public"."linksy_contact_type" rename to "linksy_contact_type__old_version_to_be_dropped";

create type "public"."linksy_contact_type" as enum ('customer', 'provider_employee');


  create table "public"."activity_feed" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "user_id" uuid not null,
    "action_type" text not null,
    "resource_type" text,
    "resource_id" uuid,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."activity_feed" enable row level security;


  create table "public"."api_key_logs" (
    "id" uuid not null default gen_random_uuid(),
    "api_key_id" uuid not null,
    "endpoint" text not null,
    "method" text not null,
    "status_code" integer,
    "response_time_ms" integer,
    "ip_address" inet,
    "user_agent" text,
    "error_message" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."api_key_logs" enable row level security;


  create table "public"."api_keys" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "key_hash" text not null,
    "key_prefix" text not null,
    "name" text not null,
    "scopes" jsonb default '[]'::jsonb,
    "rate_limit" integer default 100,
    "allowed_domains" jsonb default '[]'::jsonb,
    "status" public.api_key_status default 'active'::public.api_key_status,
    "revoked_at" timestamp with time zone,
    "revoked_reason" text,
    "grace_period_ends_at" timestamp with time zone,
    "last_used_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."api_keys" enable row level security;


  create table "public"."background_jobs" (
    "id" uuid not null default gen_random_uuid(),
    "job_type" text not null,
    "payload" jsonb not null,
    "status" public.job_status default 'pending'::public.job_status,
    "scheduled_for" timestamp with time zone default now(),
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "error_message" text,
    "retry_count" integer default 0,
    "max_retries" integer default 3,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."background_jobs" enable row level security;


  create table "public"."company_modules" (
    "company_id" uuid not null,
    "module_id" uuid not null,
    "enabled" boolean default true,
    "settings" jsonb default '{}'::jsonb,
    "enabled_at" timestamp with time zone default now(),
    "enabled_by" uuid
      );


alter table "public"."company_modules" enable row level security;


  create table "public"."custom_field_definitions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "entity_type" public.entity_type not null,
    "module_id" uuid,
    "field_name" text not null,
    "field_label" text not null,
    "field_type" public.custom_field_type not null,
    "options" jsonb,
    "is_required" boolean default false,
    "display_order" integer default 0,
    "validation_rules" jsonb,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."custom_field_definitions" enable row level security;


  create table "public"."custom_field_values" (
    "id" uuid not null default gen_random_uuid(),
    "field_id" uuid not null,
    "entity_id" uuid not null,
    "value" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."custom_field_values" enable row level security;


  create table "public"."event_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "module_id" uuid,
    "event_type" text not null,
    "handler_function" text not null,
    "enabled" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."event_subscriptions" enable row level security;


  create table "public"."feature_flags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "flag_type" public.feature_flag_type default 'boolean'::public.feature_flag_type,
    "enabled_globally" boolean default false,
    "rollout_percentage" integer default 0,
    "enabled_for_tenants" jsonb default '[]'::jsonb,
    "enabled_for_users" jsonb default '[]'::jsonb,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."feature_flags" enable row level security;


  create table "public"."file_versions" (
    "id" uuid not null default gen_random_uuid(),
    "file_id" uuid not null,
    "version_number" integer not null,
    "storage_path" text not null,
    "uploaded_by" uuid not null,
    "file_size" bigint not null,
    "uploaded_at" timestamp with time zone default now()
      );


alter table "public"."file_versions" enable row level security;


  create table "public"."invoices" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "subscription_id" uuid,
    "amount_due" numeric(10,2) not null,
    "amount_paid" numeric(10,2) default 0,
    "status" public.invoice_status default 'draft'::public.invoice_status,
    "due_date" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "external_invoice_id" text,
    "line_items" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."invoices" enable row level security;


  create table "public"."locations" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "name" text not null,
    "address" jsonb,
    "settings" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "search_vector" tsvector
      );


alter table "public"."locations" enable row level security;


  create table "public"."rate_limit_usage" (
    "tenant_id" uuid not null,
    "metric_type" text not null,
    "window_start" timestamp with time zone not null,
    "count" integer default 0
      );


alter table "public"."rate_limit_usage" enable row level security;


  create table "public"."subscription_plans" (
    "id" uuid not null default gen_random_uuid(),
    "site_id" uuid not null,
    "name" text not null,
    "billing_period" public.billing_period not null,
    "base_price" numeric(10,2) not null,
    "included_seats" integer default 1,
    "price_per_additional_seat" numeric(10,2),
    "included_modules" jsonb default '[]'::jsonb,
    "features" jsonb default '{}'::jsonb,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."subscription_plans" enable row level security;


  create table "public"."system_events" (
    "id" uuid not null default gen_random_uuid(),
    "event_type" text not null,
    "payload" jsonb not null,
    "triggered_at" timestamp with time zone default now()
      );


alter table "public"."system_events" enable row level security;


  create table "public"."tenant_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "plan_id" uuid,
    "status" public.subscription_status default 'trial'::public.subscription_status,
    "trial_ends_at" timestamp with time zone,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean default false,
    "external_subscription_id" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."tenant_subscriptions" enable row level security;


  create table "public"."usage_records" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "metric_type" text not null,
    "quantity" integer not null,
    "recorded_at" timestamp with time zone default now()
      );


alter table "public"."usage_records" enable row level security;


  create table "public"."user_locations" (
    "user_id" uuid not null,
    "location_id" uuid not null,
    "tenant_id" uuid not null,
    "is_location_admin" boolean default false,
    "assigned_at" timestamp with time zone default now(),
    "assigned_by" uuid
      );


alter table "public"."user_locations" enable row level security;


  create table "public"."user_module_permissions" (
    "user_id" uuid not null,
    "module_id" uuid not null,
    "company_id" uuid not null,
    "can_admin" boolean default false,
    "custom_permissions" jsonb default '{}'::jsonb,
    "granted_at" timestamp with time zone default now(),
    "granted_by" uuid
      );


alter table "public"."user_module_permissions" enable row level security;


  create table "public"."webhook_deliveries" (
    "id" uuid not null default gen_random_uuid(),
    "webhook_id" uuid not null,
    "event_id" uuid,
    "status" public.webhook_delivery_status default 'pending'::public.webhook_delivery_status,
    "response_code" integer,
    "response_body" text,
    "delivered_at" timestamp with time zone,
    "retry_count" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."webhook_deliveries" enable row level security;


  create table "public"."webhook_endpoints" (
    "id" uuid not null default gen_random_uuid(),
    "tenant_id" uuid not null,
    "url" text not null,
    "secret" text not null,
    "events" jsonb default '[]'::jsonb,
    "enabled" boolean default true,
    "created_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."webhook_endpoints" enable row level security;

alter table "public"."linksy_provider_contacts" alter column contact_type type "public"."linksy_contact_type" using contact_type::text::"public"."linksy_contact_type";

alter table "public"."linksy_provider_contacts" alter column "contact_type" set default 'provider_employee'::public.linksy_contact_type;

drop type "public"."linksy_contact_type__old_version_to_be_dropped";

alter table "public"."files" drop column "path";

alter table "public"."files" add column "folder_path" text;

alter table "public"."files" add column "is_shared" boolean default false;

alter table "public"."files" add column "module_id" character varying(50);

alter table "public"."files" add column "storage_path" text not null;

alter table "public"."files" add column "updated_at" timestamp with time zone default now();

alter table "public"."files" add column "uploaded_by" uuid;

alter table "public"."linksy_providers" drop column "tenant_id";

alter table "public"."linksy_tickets" drop column "assigned_at";

alter table "public"."linksy_tickets" drop column "assigned_to";

alter table "public"."linksy_tickets" drop column "custom_data";

alter table "public"."linksy_tickets" drop column "forwarded_from_provider_id";

alter table "public"."linksy_tickets" drop column "last_reassigned_at";

alter table "public"."linksy_tickets" drop column "reassignment_count";

alter table "public"."sites" drop column "is_active";

alter table "public"."sites" drop column "slug";

alter table "public"."sites" add column "domain" text;

alter table "public"."sites" add column "settings" jsonb default '{}'::jsonb;

alter table "public"."sites" alter column "id" set default gen_random_uuid();

alter table "public"."sites" enable row level security;

alter table "public"."users" add column "email_notifications" boolean default true;

alter table "public"."users" add column "language" character varying(10);

alter table "public"."users" add column "push_notifications" boolean default true;

alter table "public"."users" add column "theme" character varying(20);

alter table "public"."users" add column "timezone" character varying(100);

CREATE UNIQUE INDEX activity_feed_pkey ON public.activity_feed USING btree (id);

CREATE UNIQUE INDEX api_key_logs_pkey ON public.api_key_logs USING btree (id);

CREATE UNIQUE INDEX api_keys_key_hash_key ON public.api_keys USING btree (key_hash);

CREATE UNIQUE INDEX api_keys_pkey ON public.api_keys USING btree (id);

CREATE UNIQUE INDEX background_jobs_pkey ON public.background_jobs USING btree (id);

CREATE UNIQUE INDEX company_modules_pkey ON public.company_modules USING btree (company_id, module_id);

CREATE UNIQUE INDEX custom_field_definitions_pkey ON public.custom_field_definitions USING btree (id);

CREATE UNIQUE INDEX custom_field_values_pkey ON public.custom_field_values USING btree (id);

CREATE UNIQUE INDEX event_subscriptions_pkey ON public.event_subscriptions USING btree (id);

CREATE UNIQUE INDEX feature_flags_name_key ON public.feature_flags USING btree (name);

CREATE UNIQUE INDEX feature_flags_pkey ON public.feature_flags USING btree (id);

CREATE UNIQUE INDEX file_versions_file_id_version_number_key ON public.file_versions USING btree (file_id, version_number);

CREATE UNIQUE INDEX file_versions_pkey ON public.file_versions USING btree (id);

CREATE INDEX idx_activity_feed_created_at ON public.activity_feed USING btree (created_at DESC);

CREATE INDEX idx_activity_feed_tenant_id ON public.activity_feed USING btree (tenant_id);

CREATE INDEX idx_activity_feed_user_id ON public.activity_feed USING btree (user_id);

CREATE INDEX idx_api_key_logs_created_at ON public.api_key_logs USING btree (created_at);

CREATE INDEX idx_api_key_logs_key_id ON public.api_key_logs USING btree (api_key_id);

CREATE INDEX idx_api_keys_key_prefix ON public.api_keys USING btree (key_prefix);

CREATE INDEX idx_api_keys_status ON public.api_keys USING btree (status);

CREATE INDEX idx_api_keys_tenant_id ON public.api_keys USING btree (tenant_id);

CREATE INDEX idx_background_jobs_scheduled_for ON public.background_jobs USING btree (scheduled_for);

CREATE INDEX idx_background_jobs_status ON public.background_jobs USING btree (status);

CREATE INDEX idx_company_modules_company_id ON public.company_modules USING btree (company_id);

CREATE INDEX idx_company_modules_module_id ON public.company_modules USING btree (module_id);

CREATE INDEX idx_custom_field_values_entity_id ON public.custom_field_values USING btree (entity_id);

CREATE INDEX idx_custom_field_values_field_id ON public.custom_field_values USING btree (field_id);

CREATE INDEX idx_custom_fields_entity_type ON public.custom_field_definitions USING btree (entity_type);

CREATE INDEX idx_custom_fields_tenant_id ON public.custom_field_definitions USING btree (tenant_id);

CREATE INDEX idx_event_subscriptions_event_type ON public.event_subscriptions USING btree (event_type);

CREATE INDEX idx_feature_flags_name ON public.feature_flags USING btree (name);

CREATE INDEX idx_file_versions_file_id ON public.file_versions USING btree (file_id);

CREATE INDEX idx_files_is_shared ON public.files USING btree (is_shared);

CREATE INDEX idx_files_module_id ON public.files USING btree (module_id);

CREATE INDEX idx_files_uploaded_by ON public.files USING btree (uploaded_by);

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);

CREATE INDEX idx_invoices_tenant_id ON public.invoices USING btree (tenant_id);

CREATE INDEX idx_locations_search ON public.locations USING gin (search_vector);

CREATE INDEX idx_locations_tenant_id ON public.locations USING btree (tenant_id);

CREATE INDEX idx_rate_limit_usage_window ON public.rate_limit_usage USING btree (window_start);

CREATE INDEX idx_system_events_event_type ON public.system_events USING btree (event_type);

CREATE INDEX idx_system_events_triggered_at ON public.system_events USING btree (triggered_at DESC);

CREATE INDEX idx_tenant_subscriptions_status ON public.tenant_subscriptions USING btree (status);

CREATE INDEX idx_tenant_subscriptions_tenant_id ON public.tenant_subscriptions USING btree (tenant_id);

CREATE INDEX idx_usage_records_metric_type ON public.usage_records USING btree (metric_type);

CREATE INDEX idx_usage_records_recorded_at ON public.usage_records USING btree (recorded_at);

CREATE INDEX idx_usage_records_tenant_id ON public.usage_records USING btree (tenant_id);

CREATE INDEX idx_user_locations_location_id ON public.user_locations USING btree (location_id);

CREATE INDEX idx_user_locations_user_id ON public.user_locations USING btree (user_id);

CREATE INDEX idx_user_module_permissions_module_id ON public.user_module_permissions USING btree (module_id);

CREATE INDEX idx_user_module_permissions_user_id ON public.user_module_permissions USING btree (user_id);

CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries USING btree (status);

CREATE INDEX idx_webhook_deliveries_webhook_id ON public.webhook_deliveries USING btree (webhook_id);

CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);

CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id);

CREATE UNIQUE INDEX rate_limit_usage_pkey ON public.rate_limit_usage USING btree (tenant_id, metric_type, window_start);

CREATE UNIQUE INDEX sites_domain_key ON public.sites USING btree (domain);

CREATE UNIQUE INDEX subscription_plans_pkey ON public.subscription_plans USING btree (id);

CREATE UNIQUE INDEX system_events_pkey ON public.system_events USING btree (id);

CREATE UNIQUE INDEX tenant_subscriptions_pkey ON public.tenant_subscriptions USING btree (id);

CREATE UNIQUE INDEX unique_field_per_entity ON public.custom_field_definitions USING btree (tenant_id, entity_type, module_id, field_name);

CREATE UNIQUE INDEX usage_records_pkey ON public.usage_records USING btree (id);

CREATE UNIQUE INDEX user_locations_pkey ON public.user_locations USING btree (user_id, location_id);

CREATE UNIQUE INDEX user_module_permissions_pkey ON public.user_module_permissions USING btree (user_id, module_id, company_id);

CREATE UNIQUE INDEX webhook_deliveries_pkey ON public.webhook_deliveries USING btree (id);

CREATE UNIQUE INDEX webhook_endpoints_pkey ON public.webhook_endpoints USING btree (id);

alter table "public"."activity_feed" add constraint "activity_feed_pkey" PRIMARY KEY using index "activity_feed_pkey";

alter table "public"."api_key_logs" add constraint "api_key_logs_pkey" PRIMARY KEY using index "api_key_logs_pkey";

alter table "public"."api_keys" add constraint "api_keys_pkey" PRIMARY KEY using index "api_keys_pkey";

alter table "public"."background_jobs" add constraint "background_jobs_pkey" PRIMARY KEY using index "background_jobs_pkey";

alter table "public"."company_modules" add constraint "company_modules_pkey" PRIMARY KEY using index "company_modules_pkey";

alter table "public"."custom_field_definitions" add constraint "custom_field_definitions_pkey" PRIMARY KEY using index "custom_field_definitions_pkey";

alter table "public"."custom_field_values" add constraint "custom_field_values_pkey" PRIMARY KEY using index "custom_field_values_pkey";

alter table "public"."event_subscriptions" add constraint "event_subscriptions_pkey" PRIMARY KEY using index "event_subscriptions_pkey";

alter table "public"."feature_flags" add constraint "feature_flags_pkey" PRIMARY KEY using index "feature_flags_pkey";

alter table "public"."file_versions" add constraint "file_versions_pkey" PRIMARY KEY using index "file_versions_pkey";

alter table "public"."invoices" add constraint "invoices_pkey" PRIMARY KEY using index "invoices_pkey";

alter table "public"."locations" add constraint "locations_pkey" PRIMARY KEY using index "locations_pkey";

alter table "public"."rate_limit_usage" add constraint "rate_limit_usage_pkey" PRIMARY KEY using index "rate_limit_usage_pkey";

alter table "public"."subscription_plans" add constraint "subscription_plans_pkey" PRIMARY KEY using index "subscription_plans_pkey";

alter table "public"."system_events" add constraint "system_events_pkey" PRIMARY KEY using index "system_events_pkey";

alter table "public"."tenant_subscriptions" add constraint "tenant_subscriptions_pkey" PRIMARY KEY using index "tenant_subscriptions_pkey";

alter table "public"."usage_records" add constraint "usage_records_pkey" PRIMARY KEY using index "usage_records_pkey";

alter table "public"."user_locations" add constraint "user_locations_pkey" PRIMARY KEY using index "user_locations_pkey";

alter table "public"."user_module_permissions" add constraint "user_module_permissions_pkey" PRIMARY KEY using index "user_module_permissions_pkey";

alter table "public"."webhook_deliveries" add constraint "webhook_deliveries_pkey" PRIMARY KEY using index "webhook_deliveries_pkey";

alter table "public"."webhook_endpoints" add constraint "webhook_endpoints_pkey" PRIMARY KEY using index "webhook_endpoints_pkey";

alter table "public"."activity_feed" add constraint "activity_feed_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."activity_feed" validate constraint "activity_feed_user_id_fkey";

alter table "public"."api_key_logs" add constraint "api_key_logs_api_key_id_fkey" FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE CASCADE not valid;

alter table "public"."api_key_logs" validate constraint "api_key_logs_api_key_id_fkey";

alter table "public"."api_keys" add constraint "api_keys_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."api_keys" validate constraint "api_keys_created_by_fkey";

alter table "public"."api_keys" add constraint "api_keys_key_hash_key" UNIQUE using index "api_keys_key_hash_key";

alter table "public"."company_modules" add constraint "company_modules_enabled_by_fkey" FOREIGN KEY (enabled_by) REFERENCES auth.users(id) not valid;

alter table "public"."company_modules" validate constraint "company_modules_enabled_by_fkey";

alter table "public"."custom_field_definitions" add constraint "custom_field_definitions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."custom_field_definitions" validate constraint "custom_field_definitions_created_by_fkey";

alter table "public"."custom_field_definitions" add constraint "unique_field_per_entity" UNIQUE using index "unique_field_per_entity";

alter table "public"."custom_field_values" add constraint "custom_field_values_field_id_fkey" FOREIGN KEY (field_id) REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE not valid;

alter table "public"."custom_field_values" validate constraint "custom_field_values_field_id_fkey";

alter table "public"."feature_flags" add constraint "feature_flags_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."feature_flags" validate constraint "feature_flags_created_by_fkey";

alter table "public"."feature_flags" add constraint "feature_flags_name_key" UNIQUE using index "feature_flags_name_key";

alter table "public"."feature_flags" add constraint "feature_flags_rollout_percentage_check" CHECK (((rollout_percentage >= 0) AND (rollout_percentage <= 100))) not valid;

alter table "public"."feature_flags" validate constraint "feature_flags_rollout_percentage_check";

alter table "public"."file_versions" add constraint "file_versions_file_id_version_number_key" UNIQUE using index "file_versions_file_id_version_number_key";

alter table "public"."file_versions" add constraint "file_versions_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) not valid;

alter table "public"."file_versions" validate constraint "file_versions_uploaded_by_fkey";

alter table "public"."files" add constraint "files_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."files" validate constraint "files_uploaded_by_fkey";

alter table "public"."invoices" add constraint "invoices_subscription_id_fkey" FOREIGN KEY (subscription_id) REFERENCES public.tenant_subscriptions(id) not valid;

alter table "public"."invoices" validate constraint "invoices_subscription_id_fkey";

alter table "public"."sites" add constraint "sites_domain_key" UNIQUE using index "sites_domain_key";

alter table "public"."subscription_plans" add constraint "subscription_plans_site_id_fkey" FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE not valid;

alter table "public"."subscription_plans" validate constraint "subscription_plans_site_id_fkey";

alter table "public"."tenant_subscriptions" add constraint "tenant_subscriptions_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) not valid;

alter table "public"."tenant_subscriptions" validate constraint "tenant_subscriptions_plan_id_fkey";

alter table "public"."user_locations" add constraint "user_locations_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) not valid;

alter table "public"."user_locations" validate constraint "user_locations_assigned_by_fkey";

alter table "public"."user_locations" add constraint "user_locations_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE not valid;

alter table "public"."user_locations" validate constraint "user_locations_location_id_fkey";

alter table "public"."user_locations" add constraint "user_locations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_locations" validate constraint "user_locations_user_id_fkey";

alter table "public"."user_module_permissions" add constraint "user_module_permissions_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) not valid;

alter table "public"."user_module_permissions" validate constraint "user_module_permissions_granted_by_fkey";

alter table "public"."user_module_permissions" add constraint "user_module_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_module_permissions" validate constraint "user_module_permissions_user_id_fkey";

alter table "public"."users" add constraint "users_theme_check" CHECK (((theme)::text = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'system'::character varying])::text[]))) not valid;

alter table "public"."users" validate constraint "users_theme_check";

alter table "public"."webhook_deliveries" add constraint "webhook_deliveries_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.system_events(id) not valid;

alter table "public"."webhook_deliveries" validate constraint "webhook_deliveries_event_id_fkey";

alter table "public"."webhook_deliveries" add constraint "webhook_deliveries_webhook_id_fkey" FOREIGN KEY (webhook_id) REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE not valid;

alter table "public"."webhook_deliveries" validate constraint "webhook_deliveries_webhook_id_fkey";

alter table "public"."webhook_endpoints" add constraint "webhook_endpoints_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."webhook_endpoints" validate constraint "webhook_endpoints_created_by_fkey";

alter table "public"."linksy_provider_contacts" add constraint "linksy_provider_contacts_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'invited'::character varying, 'archived'::character varying, 'pending'::character varying])::text[]))) not valid;

alter table "public"."linksy_provider_contacts" validate constraint "linksy_provider_contacts_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_company_admin(uid uuid, tid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = uid AND tenant_id = tid 
    AND role IN ('company_admin', 'site_admin')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_site_admin(uid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE user_id = uid AND role = 'site_admin'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    changes,
    ip_address
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    ),
    inet_client_addr()
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_file_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.file_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.folder_path, '')), 'B');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_files_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_location_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.address::text, '')), 'B');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_user_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_tenant_ids(uid uuid)
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT tenant_id FROM user_tenants WHERE user_id = uid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.belongs_to_tenant(tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_id = tenant_uuid
        AND user_id = auth.uid()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_site_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'site_admin'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tenant_users
        WHERE tenant_id = tenant_uuid
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_invited_user_to_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
    v_contact_id UUID;
    v_user_email TEXT;
    v_user_metadata JSONB;
  BEGIN
    -- Get the user's email and metadata from auth.users (not from NEW which is public.users)
    SELECT email, raw_user_meta_data
    INTO v_user_email, v_user_metadata
    FROM auth.users
    WHERE id = NEW.id;

    -- Check if user was invited with contact metadata
    IF v_user_metadata ? 'contact_id' THEN
      v_contact_id := (v_user_metadata->>'contact_id')::UUID;

      -- Update the contact to link to this user and mark as accepted
      UPDATE linksy_provider_contacts
      SET
        user_id = NEW.id,
        invitation_accepted_at = NOW(),
        status = 'active',
        email = NULL,  -- Clear temporary email since we now have user_id
        full_name = NULL  -- Clear temporary full_name since we now have user_id
      WHERE id = v_contact_id
        AND user_id IS NULL;  -- Only update if not already linked

    -- Or check if there's a contact with matching email waiting for this user
    ELSIF v_user_email IS NOT NULL THEN
      -- Try to find a contact with this email but no user_id
      UPDATE linksy_provider_contacts
      SET
        user_id = NEW.id,
        invitation_accepted_at = NOW(),
        status = 'active',
        email = NULL,  -- Clear temporary email
        full_name = NULL  -- Clear temporary full_name
      WHERE email = v_user_email
        AND user_id IS NULL
        AND status = 'invited';
    END IF;

    RETURN NEW;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.linksy_check_crisis(p_message text, p_site_id uuid)
 RETURNS TABLE(crisis_type text, severity text, response_template text, emergency_resources jsonb, matched_keyword text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT ck.crisis_type, ck.severity, ck.response_template, ck.emergency_resources, ck.keyword
  FROM public.linksy_crisis_keywords ck
  WHERE ck.site_id = p_site_id AND ck.is_active = true
    AND lower(p_message) ILIKE '%' || lower(ck.keyword) || '%'
  ORDER BY
    CASE ck.severity
      WHEN 'critical' THEN 1
      WHEN 'high'     THEN 2
      WHEN 'medium'   THEN 3
      WHEN 'low'      THEN 4
    END
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.linksy_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."activity_feed" to "anon";

grant insert on table "public"."activity_feed" to "anon";

grant references on table "public"."activity_feed" to "anon";

grant select on table "public"."activity_feed" to "anon";

grant trigger on table "public"."activity_feed" to "anon";

grant truncate on table "public"."activity_feed" to "anon";

grant update on table "public"."activity_feed" to "anon";

grant delete on table "public"."activity_feed" to "authenticated";

grant insert on table "public"."activity_feed" to "authenticated";

grant references on table "public"."activity_feed" to "authenticated";

grant select on table "public"."activity_feed" to "authenticated";

grant trigger on table "public"."activity_feed" to "authenticated";

grant truncate on table "public"."activity_feed" to "authenticated";

grant update on table "public"."activity_feed" to "authenticated";

grant delete on table "public"."activity_feed" to "service_role";

grant insert on table "public"."activity_feed" to "service_role";

grant references on table "public"."activity_feed" to "service_role";

grant select on table "public"."activity_feed" to "service_role";

grant trigger on table "public"."activity_feed" to "service_role";

grant truncate on table "public"."activity_feed" to "service_role";

grant update on table "public"."activity_feed" to "service_role";

grant delete on table "public"."api_key_logs" to "anon";

grant insert on table "public"."api_key_logs" to "anon";

grant references on table "public"."api_key_logs" to "anon";

grant select on table "public"."api_key_logs" to "anon";

grant trigger on table "public"."api_key_logs" to "anon";

grant truncate on table "public"."api_key_logs" to "anon";

grant update on table "public"."api_key_logs" to "anon";

grant delete on table "public"."api_key_logs" to "authenticated";

grant insert on table "public"."api_key_logs" to "authenticated";

grant references on table "public"."api_key_logs" to "authenticated";

grant select on table "public"."api_key_logs" to "authenticated";

grant trigger on table "public"."api_key_logs" to "authenticated";

grant truncate on table "public"."api_key_logs" to "authenticated";

grant update on table "public"."api_key_logs" to "authenticated";

grant delete on table "public"."api_key_logs" to "service_role";

grant insert on table "public"."api_key_logs" to "service_role";

grant references on table "public"."api_key_logs" to "service_role";

grant select on table "public"."api_key_logs" to "service_role";

grant trigger on table "public"."api_key_logs" to "service_role";

grant truncate on table "public"."api_key_logs" to "service_role";

grant update on table "public"."api_key_logs" to "service_role";

grant delete on table "public"."api_keys" to "anon";

grant insert on table "public"."api_keys" to "anon";

grant references on table "public"."api_keys" to "anon";

grant select on table "public"."api_keys" to "anon";

grant trigger on table "public"."api_keys" to "anon";

grant truncate on table "public"."api_keys" to "anon";

grant update on table "public"."api_keys" to "anon";

grant delete on table "public"."api_keys" to "authenticated";

grant insert on table "public"."api_keys" to "authenticated";

grant references on table "public"."api_keys" to "authenticated";

grant select on table "public"."api_keys" to "authenticated";

grant trigger on table "public"."api_keys" to "authenticated";

grant truncate on table "public"."api_keys" to "authenticated";

grant update on table "public"."api_keys" to "authenticated";

grant delete on table "public"."api_keys" to "service_role";

grant insert on table "public"."api_keys" to "service_role";

grant references on table "public"."api_keys" to "service_role";

grant select on table "public"."api_keys" to "service_role";

grant trigger on table "public"."api_keys" to "service_role";

grant truncate on table "public"."api_keys" to "service_role";

grant update on table "public"."api_keys" to "service_role";

grant delete on table "public"."background_jobs" to "anon";

grant insert on table "public"."background_jobs" to "anon";

grant references on table "public"."background_jobs" to "anon";

grant select on table "public"."background_jobs" to "anon";

grant trigger on table "public"."background_jobs" to "anon";

grant truncate on table "public"."background_jobs" to "anon";

grant update on table "public"."background_jobs" to "anon";

grant delete on table "public"."background_jobs" to "authenticated";

grant insert on table "public"."background_jobs" to "authenticated";

grant references on table "public"."background_jobs" to "authenticated";

grant select on table "public"."background_jobs" to "authenticated";

grant trigger on table "public"."background_jobs" to "authenticated";

grant truncate on table "public"."background_jobs" to "authenticated";

grant update on table "public"."background_jobs" to "authenticated";

grant delete on table "public"."background_jobs" to "service_role";

grant insert on table "public"."background_jobs" to "service_role";

grant references on table "public"."background_jobs" to "service_role";

grant select on table "public"."background_jobs" to "service_role";

grant trigger on table "public"."background_jobs" to "service_role";

grant truncate on table "public"."background_jobs" to "service_role";

grant update on table "public"."background_jobs" to "service_role";

grant delete on table "public"."company_modules" to "anon";

grant insert on table "public"."company_modules" to "anon";

grant references on table "public"."company_modules" to "anon";

grant select on table "public"."company_modules" to "anon";

grant trigger on table "public"."company_modules" to "anon";

grant truncate on table "public"."company_modules" to "anon";

grant update on table "public"."company_modules" to "anon";

grant delete on table "public"."company_modules" to "authenticated";

grant insert on table "public"."company_modules" to "authenticated";

grant references on table "public"."company_modules" to "authenticated";

grant select on table "public"."company_modules" to "authenticated";

grant trigger on table "public"."company_modules" to "authenticated";

grant truncate on table "public"."company_modules" to "authenticated";

grant update on table "public"."company_modules" to "authenticated";

grant delete on table "public"."company_modules" to "service_role";

grant insert on table "public"."company_modules" to "service_role";

grant references on table "public"."company_modules" to "service_role";

grant select on table "public"."company_modules" to "service_role";

grant trigger on table "public"."company_modules" to "service_role";

grant truncate on table "public"."company_modules" to "service_role";

grant update on table "public"."company_modules" to "service_role";

grant delete on table "public"."custom_field_definitions" to "anon";

grant insert on table "public"."custom_field_definitions" to "anon";

grant references on table "public"."custom_field_definitions" to "anon";

grant select on table "public"."custom_field_definitions" to "anon";

grant trigger on table "public"."custom_field_definitions" to "anon";

grant truncate on table "public"."custom_field_definitions" to "anon";

grant update on table "public"."custom_field_definitions" to "anon";

grant delete on table "public"."custom_field_definitions" to "authenticated";

grant insert on table "public"."custom_field_definitions" to "authenticated";

grant references on table "public"."custom_field_definitions" to "authenticated";

grant select on table "public"."custom_field_definitions" to "authenticated";

grant trigger on table "public"."custom_field_definitions" to "authenticated";

grant truncate on table "public"."custom_field_definitions" to "authenticated";

grant update on table "public"."custom_field_definitions" to "authenticated";

grant delete on table "public"."custom_field_definitions" to "service_role";

grant insert on table "public"."custom_field_definitions" to "service_role";

grant references on table "public"."custom_field_definitions" to "service_role";

grant select on table "public"."custom_field_definitions" to "service_role";

grant trigger on table "public"."custom_field_definitions" to "service_role";

grant truncate on table "public"."custom_field_definitions" to "service_role";

grant update on table "public"."custom_field_definitions" to "service_role";

grant delete on table "public"."custom_field_values" to "anon";

grant insert on table "public"."custom_field_values" to "anon";

grant references on table "public"."custom_field_values" to "anon";

grant select on table "public"."custom_field_values" to "anon";

grant trigger on table "public"."custom_field_values" to "anon";

grant truncate on table "public"."custom_field_values" to "anon";

grant update on table "public"."custom_field_values" to "anon";

grant delete on table "public"."custom_field_values" to "authenticated";

grant insert on table "public"."custom_field_values" to "authenticated";

grant references on table "public"."custom_field_values" to "authenticated";

grant select on table "public"."custom_field_values" to "authenticated";

grant trigger on table "public"."custom_field_values" to "authenticated";

grant truncate on table "public"."custom_field_values" to "authenticated";

grant update on table "public"."custom_field_values" to "authenticated";

grant delete on table "public"."custom_field_values" to "service_role";

grant insert on table "public"."custom_field_values" to "service_role";

grant references on table "public"."custom_field_values" to "service_role";

grant select on table "public"."custom_field_values" to "service_role";

grant trigger on table "public"."custom_field_values" to "service_role";

grant truncate on table "public"."custom_field_values" to "service_role";

grant update on table "public"."custom_field_values" to "service_role";

grant delete on table "public"."event_subscriptions" to "anon";

grant insert on table "public"."event_subscriptions" to "anon";

grant references on table "public"."event_subscriptions" to "anon";

grant select on table "public"."event_subscriptions" to "anon";

grant trigger on table "public"."event_subscriptions" to "anon";

grant truncate on table "public"."event_subscriptions" to "anon";

grant update on table "public"."event_subscriptions" to "anon";

grant delete on table "public"."event_subscriptions" to "authenticated";

grant insert on table "public"."event_subscriptions" to "authenticated";

grant references on table "public"."event_subscriptions" to "authenticated";

grant select on table "public"."event_subscriptions" to "authenticated";

grant trigger on table "public"."event_subscriptions" to "authenticated";

grant truncate on table "public"."event_subscriptions" to "authenticated";

grant update on table "public"."event_subscriptions" to "authenticated";

grant delete on table "public"."event_subscriptions" to "service_role";

grant insert on table "public"."event_subscriptions" to "service_role";

grant references on table "public"."event_subscriptions" to "service_role";

grant select on table "public"."event_subscriptions" to "service_role";

grant trigger on table "public"."event_subscriptions" to "service_role";

grant truncate on table "public"."event_subscriptions" to "service_role";

grant update on table "public"."event_subscriptions" to "service_role";

grant delete on table "public"."feature_flags" to "anon";

grant insert on table "public"."feature_flags" to "anon";

grant references on table "public"."feature_flags" to "anon";

grant select on table "public"."feature_flags" to "anon";

grant trigger on table "public"."feature_flags" to "anon";

grant truncate on table "public"."feature_flags" to "anon";

grant update on table "public"."feature_flags" to "anon";

grant delete on table "public"."feature_flags" to "authenticated";

grant insert on table "public"."feature_flags" to "authenticated";

grant references on table "public"."feature_flags" to "authenticated";

grant select on table "public"."feature_flags" to "authenticated";

grant trigger on table "public"."feature_flags" to "authenticated";

grant truncate on table "public"."feature_flags" to "authenticated";

grant update on table "public"."feature_flags" to "authenticated";

grant delete on table "public"."feature_flags" to "service_role";

grant insert on table "public"."feature_flags" to "service_role";

grant references on table "public"."feature_flags" to "service_role";

grant select on table "public"."feature_flags" to "service_role";

grant trigger on table "public"."feature_flags" to "service_role";

grant truncate on table "public"."feature_flags" to "service_role";

grant update on table "public"."feature_flags" to "service_role";

grant delete on table "public"."file_versions" to "anon";

grant insert on table "public"."file_versions" to "anon";

grant references on table "public"."file_versions" to "anon";

grant select on table "public"."file_versions" to "anon";

grant trigger on table "public"."file_versions" to "anon";

grant truncate on table "public"."file_versions" to "anon";

grant update on table "public"."file_versions" to "anon";

grant delete on table "public"."file_versions" to "authenticated";

grant insert on table "public"."file_versions" to "authenticated";

grant references on table "public"."file_versions" to "authenticated";

grant select on table "public"."file_versions" to "authenticated";

grant trigger on table "public"."file_versions" to "authenticated";

grant truncate on table "public"."file_versions" to "authenticated";

grant update on table "public"."file_versions" to "authenticated";

grant delete on table "public"."file_versions" to "service_role";

grant insert on table "public"."file_versions" to "service_role";

grant references on table "public"."file_versions" to "service_role";

grant select on table "public"."file_versions" to "service_role";

grant trigger on table "public"."file_versions" to "service_role";

grant truncate on table "public"."file_versions" to "service_role";

grant update on table "public"."file_versions" to "service_role";

grant delete on table "public"."invoices" to "anon";

grant insert on table "public"."invoices" to "anon";

grant references on table "public"."invoices" to "anon";

grant select on table "public"."invoices" to "anon";

grant trigger on table "public"."invoices" to "anon";

grant truncate on table "public"."invoices" to "anon";

grant update on table "public"."invoices" to "anon";

grant delete on table "public"."invoices" to "authenticated";

grant insert on table "public"."invoices" to "authenticated";

grant references on table "public"."invoices" to "authenticated";

grant select on table "public"."invoices" to "authenticated";

grant trigger on table "public"."invoices" to "authenticated";

grant truncate on table "public"."invoices" to "authenticated";

grant update on table "public"."invoices" to "authenticated";

grant delete on table "public"."invoices" to "service_role";

grant insert on table "public"."invoices" to "service_role";

grant references on table "public"."invoices" to "service_role";

grant select on table "public"."invoices" to "service_role";

grant trigger on table "public"."invoices" to "service_role";

grant truncate on table "public"."invoices" to "service_role";

grant update on table "public"."invoices" to "service_role";

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."rate_limit_usage" to "anon";

grant insert on table "public"."rate_limit_usage" to "anon";

grant references on table "public"."rate_limit_usage" to "anon";

grant select on table "public"."rate_limit_usage" to "anon";

grant trigger on table "public"."rate_limit_usage" to "anon";

grant truncate on table "public"."rate_limit_usage" to "anon";

grant update on table "public"."rate_limit_usage" to "anon";

grant delete on table "public"."rate_limit_usage" to "authenticated";

grant insert on table "public"."rate_limit_usage" to "authenticated";

grant references on table "public"."rate_limit_usage" to "authenticated";

grant select on table "public"."rate_limit_usage" to "authenticated";

grant trigger on table "public"."rate_limit_usage" to "authenticated";

grant truncate on table "public"."rate_limit_usage" to "authenticated";

grant update on table "public"."rate_limit_usage" to "authenticated";

grant delete on table "public"."rate_limit_usage" to "service_role";

grant insert on table "public"."rate_limit_usage" to "service_role";

grant references on table "public"."rate_limit_usage" to "service_role";

grant select on table "public"."rate_limit_usage" to "service_role";

grant trigger on table "public"."rate_limit_usage" to "service_role";

grant truncate on table "public"."rate_limit_usage" to "service_role";

grant update on table "public"."rate_limit_usage" to "service_role";

grant delete on table "public"."subscription_plans" to "anon";

grant insert on table "public"."subscription_plans" to "anon";

grant references on table "public"."subscription_plans" to "anon";

grant select on table "public"."subscription_plans" to "anon";

grant trigger on table "public"."subscription_plans" to "anon";

grant truncate on table "public"."subscription_plans" to "anon";

grant update on table "public"."subscription_plans" to "anon";

grant delete on table "public"."subscription_plans" to "authenticated";

grant insert on table "public"."subscription_plans" to "authenticated";

grant references on table "public"."subscription_plans" to "authenticated";

grant select on table "public"."subscription_plans" to "authenticated";

grant trigger on table "public"."subscription_plans" to "authenticated";

grant truncate on table "public"."subscription_plans" to "authenticated";

grant update on table "public"."subscription_plans" to "authenticated";

grant delete on table "public"."subscription_plans" to "service_role";

grant insert on table "public"."subscription_plans" to "service_role";

grant references on table "public"."subscription_plans" to "service_role";

grant select on table "public"."subscription_plans" to "service_role";

grant trigger on table "public"."subscription_plans" to "service_role";

grant truncate on table "public"."subscription_plans" to "service_role";

grant update on table "public"."subscription_plans" to "service_role";

grant delete on table "public"."system_events" to "anon";

grant insert on table "public"."system_events" to "anon";

grant references on table "public"."system_events" to "anon";

grant select on table "public"."system_events" to "anon";

grant trigger on table "public"."system_events" to "anon";

grant truncate on table "public"."system_events" to "anon";

grant update on table "public"."system_events" to "anon";

grant delete on table "public"."system_events" to "authenticated";

grant insert on table "public"."system_events" to "authenticated";

grant references on table "public"."system_events" to "authenticated";

grant select on table "public"."system_events" to "authenticated";

grant trigger on table "public"."system_events" to "authenticated";

grant truncate on table "public"."system_events" to "authenticated";

grant update on table "public"."system_events" to "authenticated";

grant delete on table "public"."system_events" to "service_role";

grant insert on table "public"."system_events" to "service_role";

grant references on table "public"."system_events" to "service_role";

grant select on table "public"."system_events" to "service_role";

grant trigger on table "public"."system_events" to "service_role";

grant truncate on table "public"."system_events" to "service_role";

grant update on table "public"."system_events" to "service_role";

grant delete on table "public"."tenant_subscriptions" to "anon";

grant insert on table "public"."tenant_subscriptions" to "anon";

grant references on table "public"."tenant_subscriptions" to "anon";

grant select on table "public"."tenant_subscriptions" to "anon";

grant trigger on table "public"."tenant_subscriptions" to "anon";

grant truncate on table "public"."tenant_subscriptions" to "anon";

grant update on table "public"."tenant_subscriptions" to "anon";

grant delete on table "public"."tenant_subscriptions" to "authenticated";

grant insert on table "public"."tenant_subscriptions" to "authenticated";

grant references on table "public"."tenant_subscriptions" to "authenticated";

grant select on table "public"."tenant_subscriptions" to "authenticated";

grant trigger on table "public"."tenant_subscriptions" to "authenticated";

grant truncate on table "public"."tenant_subscriptions" to "authenticated";

grant update on table "public"."tenant_subscriptions" to "authenticated";

grant delete on table "public"."tenant_subscriptions" to "service_role";

grant insert on table "public"."tenant_subscriptions" to "service_role";

grant references on table "public"."tenant_subscriptions" to "service_role";

grant select on table "public"."tenant_subscriptions" to "service_role";

grant trigger on table "public"."tenant_subscriptions" to "service_role";

grant truncate on table "public"."tenant_subscriptions" to "service_role";

grant update on table "public"."tenant_subscriptions" to "service_role";

grant delete on table "public"."usage_records" to "anon";

grant insert on table "public"."usage_records" to "anon";

grant references on table "public"."usage_records" to "anon";

grant select on table "public"."usage_records" to "anon";

grant trigger on table "public"."usage_records" to "anon";

grant truncate on table "public"."usage_records" to "anon";

grant update on table "public"."usage_records" to "anon";

grant delete on table "public"."usage_records" to "authenticated";

grant insert on table "public"."usage_records" to "authenticated";

grant references on table "public"."usage_records" to "authenticated";

grant select on table "public"."usage_records" to "authenticated";

grant trigger on table "public"."usage_records" to "authenticated";

grant truncate on table "public"."usage_records" to "authenticated";

grant update on table "public"."usage_records" to "authenticated";

grant delete on table "public"."usage_records" to "service_role";

grant insert on table "public"."usage_records" to "service_role";

grant references on table "public"."usage_records" to "service_role";

grant select on table "public"."usage_records" to "service_role";

grant trigger on table "public"."usage_records" to "service_role";

grant truncate on table "public"."usage_records" to "service_role";

grant update on table "public"."usage_records" to "service_role";

grant delete on table "public"."user_locations" to "anon";

grant insert on table "public"."user_locations" to "anon";

grant references on table "public"."user_locations" to "anon";

grant select on table "public"."user_locations" to "anon";

grant trigger on table "public"."user_locations" to "anon";

grant truncate on table "public"."user_locations" to "anon";

grant update on table "public"."user_locations" to "anon";

grant delete on table "public"."user_locations" to "authenticated";

grant insert on table "public"."user_locations" to "authenticated";

grant references on table "public"."user_locations" to "authenticated";

grant select on table "public"."user_locations" to "authenticated";

grant trigger on table "public"."user_locations" to "authenticated";

grant truncate on table "public"."user_locations" to "authenticated";

grant update on table "public"."user_locations" to "authenticated";

grant delete on table "public"."user_locations" to "service_role";

grant insert on table "public"."user_locations" to "service_role";

grant references on table "public"."user_locations" to "service_role";

grant select on table "public"."user_locations" to "service_role";

grant trigger on table "public"."user_locations" to "service_role";

grant truncate on table "public"."user_locations" to "service_role";

grant update on table "public"."user_locations" to "service_role";

grant delete on table "public"."user_module_permissions" to "anon";

grant insert on table "public"."user_module_permissions" to "anon";

grant references on table "public"."user_module_permissions" to "anon";

grant select on table "public"."user_module_permissions" to "anon";

grant trigger on table "public"."user_module_permissions" to "anon";

grant truncate on table "public"."user_module_permissions" to "anon";

grant update on table "public"."user_module_permissions" to "anon";

grant delete on table "public"."user_module_permissions" to "authenticated";

grant insert on table "public"."user_module_permissions" to "authenticated";

grant references on table "public"."user_module_permissions" to "authenticated";

grant select on table "public"."user_module_permissions" to "authenticated";

grant trigger on table "public"."user_module_permissions" to "authenticated";

grant truncate on table "public"."user_module_permissions" to "authenticated";

grant update on table "public"."user_module_permissions" to "authenticated";

grant delete on table "public"."user_module_permissions" to "service_role";

grant insert on table "public"."user_module_permissions" to "service_role";

grant references on table "public"."user_module_permissions" to "service_role";

grant select on table "public"."user_module_permissions" to "service_role";

grant trigger on table "public"."user_module_permissions" to "service_role";

grant truncate on table "public"."user_module_permissions" to "service_role";

grant update on table "public"."user_module_permissions" to "service_role";

grant delete on table "public"."webhook_deliveries" to "anon";

grant insert on table "public"."webhook_deliveries" to "anon";

grant references on table "public"."webhook_deliveries" to "anon";

grant select on table "public"."webhook_deliveries" to "anon";

grant trigger on table "public"."webhook_deliveries" to "anon";

grant truncate on table "public"."webhook_deliveries" to "anon";

grant update on table "public"."webhook_deliveries" to "anon";

grant delete on table "public"."webhook_deliveries" to "authenticated";

grant insert on table "public"."webhook_deliveries" to "authenticated";

grant references on table "public"."webhook_deliveries" to "authenticated";

grant select on table "public"."webhook_deliveries" to "authenticated";

grant trigger on table "public"."webhook_deliveries" to "authenticated";

grant truncate on table "public"."webhook_deliveries" to "authenticated";

grant update on table "public"."webhook_deliveries" to "authenticated";

grant delete on table "public"."webhook_deliveries" to "service_role";

grant insert on table "public"."webhook_deliveries" to "service_role";

grant references on table "public"."webhook_deliveries" to "service_role";

grant select on table "public"."webhook_deliveries" to "service_role";

grant trigger on table "public"."webhook_deliveries" to "service_role";

grant truncate on table "public"."webhook_deliveries" to "service_role";

grant update on table "public"."webhook_deliveries" to "service_role";

grant delete on table "public"."webhook_endpoints" to "anon";

grant insert on table "public"."webhook_endpoints" to "anon";

grant references on table "public"."webhook_endpoints" to "anon";

grant select on table "public"."webhook_endpoints" to "anon";

grant trigger on table "public"."webhook_endpoints" to "anon";

grant truncate on table "public"."webhook_endpoints" to "anon";

grant update on table "public"."webhook_endpoints" to "anon";

grant delete on table "public"."webhook_endpoints" to "authenticated";

grant insert on table "public"."webhook_endpoints" to "authenticated";

grant references on table "public"."webhook_endpoints" to "authenticated";

grant select on table "public"."webhook_endpoints" to "authenticated";

grant trigger on table "public"."webhook_endpoints" to "authenticated";

grant truncate on table "public"."webhook_endpoints" to "authenticated";

grant update on table "public"."webhook_endpoints" to "authenticated";

grant delete on table "public"."webhook_endpoints" to "service_role";

grant insert on table "public"."webhook_endpoints" to "service_role";

grant references on table "public"."webhook_endpoints" to "service_role";

grant select on table "public"."webhook_endpoints" to "service_role";

grant trigger on table "public"."webhook_endpoints" to "service_role";

grant truncate on table "public"."webhook_endpoints" to "service_role";

grant update on table "public"."webhook_endpoints" to "service_role";


  create policy "Company admins can view API key logs"
  on "public"."api_key_logs"
  as permissive
  for select
  to public
using ((api_key_id IN ( SELECT api_keys.id
   FROM public.api_keys
  WHERE (api_keys.tenant_id IN ( SELECT public.user_tenant_ids(auth.uid()) AS user_tenant_ids)))));



  create policy "Company admins can manage API keys"
  on "public"."api_keys"
  as permissive
  for all
  to public
using (public.is_company_admin(auth.uid(), tenant_id));



  create policy "Tenant admins can view their logs"
  on "public"."audit_logs"
  as permissive
  for select
  to public
using (((tenant_id IS NOT NULL) AND public.is_tenant_admin(tenant_id)));



  create policy "Company admins manage company modules"
  on "public"."company_modules"
  as permissive
  for all
  to public
using (public.is_company_admin(auth.uid(), company_id));



  create policy "Users can view their company modules"
  on "public"."company_modules"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT public.user_tenant_ids(auth.uid()) AS user_tenant_ids)));



  create policy "Tenant admins can delete tenant files"
  on "public"."files"
  as permissive
  for delete
  to public
using (public.is_tenant_admin(tenant_id));



  create policy "Users can delete their files"
  on "public"."files"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "Users can delete their own files or admins can delete tenant fi"
  on "public"."files"
  as permissive
  for delete
  to public
using (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))) AND ((uploaded_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.tenant_id = files.tenant_id) AND (tenant_users.role = 'admin'::public.tenant_role)))))));



  create policy "Users can update their own files or admins can update tenant fi"
  on "public"."files"
  as permissive
  for update
  to public
using (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))) AND ((uploaded_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.tenant_users
  WHERE ((tenant_users.user_id = auth.uid()) AND (tenant_users.tenant_id = files.tenant_id) AND (tenant_users.role = 'admin'::public.tenant_role)))))));



  create policy "Users can upload files to their tenant"
  on "public"."files"
  as permissive
  for insert
  to public
with check (((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))) AND (uploaded_by = auth.uid())));



  create policy "Users can upload files"
  on "public"."files"
  as permissive
  for insert
  to public
with check (public.belongs_to_tenant(tenant_id));



  create policy "Users can view files from their tenant"
  on "public"."files"
  as permissive
  for select
  to public
using ((tenant_id IN ( SELECT tenant_users.tenant_id
   FROM public.tenant_users
  WHERE (tenant_users.user_id = auth.uid()))));



  create policy "Users can view tenant files"
  on "public"."files"
  as permissive
  for select
  to public
using (public.belongs_to_tenant(tenant_id));



  create policy "Admins can create invitations"
  on "public"."invitations"
  as permissive
  for insert
  to public
with check ((public.is_tenant_admin(tenant_id) OR public.is_site_admin()));



  create policy "Admins can delete invitations"
  on "public"."invitations"
  as permissive
  for delete
  to public
using ((public.is_tenant_admin(tenant_id) OR public.is_site_admin()));



  create policy "Admins can view invitations"
  on "public"."invitations"
  as permissive
  for select
  to public
using ((public.is_tenant_admin(tenant_id) OR public.is_site_admin()));



  create policy "Company admins can manage locations"
  on "public"."locations"
  as permissive
  for all
  to public
using (public.is_company_admin(auth.uid(), tenant_id));



  create policy "Users can view locations in their tenants"
  on "public"."locations"
  as permissive
  for select
  to public
using ((tenant_id IN ( SELECT public.user_tenant_ids(auth.uid()) AS user_tenant_ids)));



  create policy "Users can update their notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "Users can view their notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Tenant admins can manage their modules"
  on "public"."tenant_modules"
  as permissive
  for all
  to public
using (public.is_tenant_admin(tenant_id));



  create policy "Tenant admins can manage their memberships"
  on "public"."tenant_users"
  as permissive
  for all
  to public
using (public.is_tenant_admin(tenant_id));



  create policy "Tenant admins can view their memberships"
  on "public"."tenant_users"
  as permissive
  for select
  to public
using (public.is_tenant_admin(tenant_id));



  create policy "Users can view their memberships"
  on "public"."tenant_users"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Admins can update their tenant"
  on "public"."tenants"
  as permissive
  for update
  to public
using ((public.is_site_admin() OR public.is_tenant_admin(id)));



  create policy "Company admins manage user module permissions"
  on "public"."user_module_permissions"
  as permissive
  for all
  to public
using (public.is_company_admin(auth.uid(), company_id));



  create policy "Users can view module permissions in their companies"
  on "public"."user_module_permissions"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT public.user_tenant_ids(auth.uid()) AS user_tenant_ids)));



  create policy "Users can view tenant members"
  on "public"."users"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.tenant_users tu1
     JOIN public.tenant_users tu2 ON ((tu1.tenant_id = tu2.tenant_id)))
  WHERE ((tu1.user_id = auth.uid()) AND (tu2.user_id = users.id)))));


CREATE TRIGGER files_updated_at_trigger BEFORE UPDATE ON public.files FOR EACH ROW EXECUTE FUNCTION public.update_files_updated_at();

CREATE TRIGGER locations_search_update BEFORE INSERT OR UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_location_search_vector();

CREATE TRIGGER link_invited_user_trigger AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.link_invited_user_to_contact();

drop trigger if exists "link_invited_user_trigger" on "auth"."users";


  create policy "Anyone can view tenant uploads"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'tenant-uploads'::text));



  create policy "Anyone can view user uploads"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'user-uploads'::text));



  create policy "Avatar images are publicly accessible"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "Tenant admins can delete tenant uploads"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'tenant-uploads'::text));



  create policy "Tenant admins can update tenant uploads"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'tenant-uploads'::text));



  create policy "Tenant admins can upload to their tenant folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'tenant-uploads'::text) AND ((storage.foldername(name))[1] = 'logos'::text)));



  create policy "Users can delete their own avatar"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can delete their own uploads"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



  create policy "Users can update their own avatar"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can update their own uploads"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));



  create policy "Users can upload their own avatar"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "Users can upload to their own folder"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'user-uploads'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));


CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();



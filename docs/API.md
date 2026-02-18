# API Documentation

This document covers two layers of API routes: the **Linksy domain APIs** added for this project, and the **base template APIs** inherited from the multi-tenant SaaS scaffold.

## Table of Contents

- [Linksy Domain APIs](#linksy-domain-apis)
  - [AI Search](#post-apilinksy-search)
  - [Interactions](#post-apilinksy-interactions)
  - [Providers](#providers-api)
  - [Tickets](#tickets-api)
  - [Stats / Search Analytics](#get-apistatssearch-analytics)
- [Base Template APIs](#base-template-apis)
  - [Authentication](#authentication)
  - [Activity Feed](#activity-feed)
  - [Audit Logs](#audit-logs)
  - [Files](#files)
  - [Search](#search)
- [Error Responses](#error-responses)

---

## Linksy Domain APIs

### POST /api/linksy/search

AI-powered natural language search for community resource providers. **No auth required** (public endpoint used by embedded widget).

**Body:**
```json
{
  "query": "I need help with food",
  "zipCode": "32073",
  "location": { "lat": 30.1, "lng": -81.7 },
  "hostProviderId": "uuid",
  "sessionId": "uuid-or-null"
}
```
- `query` is required; `zipCode` or `location` is optional (enables proximity sorting)
- `hostProviderId` associates the search with a host provider for usage tracking
- `sessionId` continues an existing session (increments message count); omit to start a new session

**Response:**
```json
{
  "query": "...",
  "needs": [{ "id": "...", "name": "Food Assistance", "similarity": 0.87 }],
  "providers": [{ "id": "...", "name": "...", "distance": 2.4, ... }],
  "message": "Here are some organizations that can help with food...",
  "searchRadiusMiles": 10,
  "sessionId": "uuid"
}
```

**Pipeline:** embed query → vector search needs → resolve providers → ring-based proximity (10/25/50 mi) → GPT-4o-mini response → session tracking

---

### POST /api/linksy/interactions

Log a user interaction (click, call, website visit) within a search session. **No auth required.**

**Body:**
```json
{
  "sessionId": "uuid",
  "providerId": "uuid",
  "interactionType": "phone_click"
}
```
`interactionType` values: `phone_click`, `website_click`, `directions_click`, `profile_view`

**Response:** `{ "success": true }`

---

### Providers API

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/providers` | `requireAuth` | List providers (with filters) |
| POST | `/api/providers` | `requireTenantAdmin` | Create provider |
| GET | `/api/providers/[id]` | `requireAuth` | Provider detail + contacts + notes |
| PATCH | `/api/providers/[id]` | `requireTenantAdmin` | Update provider |
| POST | `/api/providers/[id]/notes` | `requireAuth` | Add note to provider |
| PATCH | `/api/providers/[id]/notes/[noteId]` | `requireAuth` | Edit note (own notes; site_admin can edit any) |
| DELETE | `/api/providers/[id]/notes/[noteId]` | `requireAuth` | Delete note |
| POST | `/api/providers/[id]/contacts/[contactId]/invite` | `requireTenantAdmin` | Invite provider contact via email |

---

### Tickets API

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/tickets` | `requireAuth` | List tickets (filterable by status, provider, need, date) |
| POST | `/api/tickets` | `requireTenantAdmin` | Create ticket; auto-assigns to default referral handler; sends email notification |
| GET | `/api/tickets/[id]` | `requireAuth` | Ticket detail with comments |
| PATCH | `/api/tickets/[id]` | `requireTenantAdmin` | Update ticket; sends status-change email to client if `client_email` set |

---

### GET /api/stats/search-analytics

Returns search and AI usage analytics for the admin dashboard. **Requires auth.**

**Response:**
```json
{
  "totalSessions": 1250,
  "sessionsLast30Days": 340,
  "totalInteractions": 872,
  "totalCrisisDetections": 12,
  "monthlySearchTrend": [{ "month": "2025-03", "count": 42 }],
  "interactionsByType": [{ "type": "phone_click", "count": 330 }],
  "topProvidersByInteraction": [{ "id": "...", "name": "...", "count": 88 }],
  "crisisBreakdown": [{ "type": "mental_health", "count": 7 }],
  "recentCrisisSessions": [...]
}
```

---

## Base Template APIs

## Authentication

All admin API routes require authentication via Supabase JWT token (cookie-based SSR session). The token is automatically included in requests by the Supabase client.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Authentication Errors

```json
{
  "error": "Unauthorized",
  "status": 401
}
```

## Activity Feed

### GET /api/activity

Fetch activity feed for the current user's tenant.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| scope | string | No | `personal` or `company` (default: `company`) |
| action_type | string | No | Filter by action type |
| limit | number | No | Number of items to return (default: `20`) |
| offset | number | No | Pagination offset (default: `0`) |

#### Request Example

```bash
GET /api/activity?scope=company&limit=20&offset=0
```

#### Response Example

```json
{
  "activities": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tenant_id": "tenant-uuid",
      "user_id": "user-uuid",
      "action": "user.created",
      "resource_type": "user",
      "resource_id": "new-user-uuid",
      "details": {
        "email": "newuser@example.com"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "user": {
        "email": "admin@example.com",
        "profile": {
          "full_name": "John Doe",
          "avatar_url": "https://..."
        }
      }
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextOffset": 20,
    "total": 150
  }
}
```

#### Errors

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not associated with a tenant
- `500 Internal Server Error` - Server error

## Audit Logs

### GET /api/audit-logs

Fetch audit logs (Admin only).

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| action_type | string | No | Filter by action type |
| user_id | string | No | Filter by user ID |
| from_date | string | No | Start date (ISO 8601) |
| to_date | string | No | End date (ISO 8601) |
| limit | number | No | Number of items (default: `50`, max: `1000`) |
| offset | number | No | Pagination offset (default: `0`) |

#### Request Example

```bash
GET /api/audit-logs?action_type=user.created&from_date=2024-01-01T00:00:00Z&limit=50
```

#### Response Example

```json
{
  "logs": [
    {
      "id": "log-uuid",
      "tenant_id": "tenant-uuid",
      "user_id": "user-uuid",
      "action": "user.created",
      "resource_type": "user",
      "resource_id": "resource-uuid",
      "details": {
        "email": "user@example.com",
        "role": "member"
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2024-01-15T10:30:00Z",
      "user": {
        "email": "admin@example.com",
        "profile": {
          "full_name": "Admin User"
        }
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1250
  }
}
```

#### Errors

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User is not an admin
- `500 Internal Server Error` - Server error

## Files

### GET /api/files

List files for the current user's tenant.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| moduleId | string | No | Filter by module ID |
| folderPath | string | No | Filter by folder path |
| limit | number | No | Number of items (default: `50`) |
| offset | number | No | Pagination offset (default: `0`) |

#### Request Example

```bash
GET /api/files?moduleId=general&folderPath=documents&limit=20
```

#### Response Example

```json
{
  "files": [
    {
      "id": "file-uuid",
      "tenant_id": "tenant-uuid",
      "module_id": "general",
      "uploaded_by": "user-uuid",
      "name": "document.pdf",
      "size": 1048576,
      "mime_type": "application/pdf",
      "storage_path": "files/tenant-id/general/user-id/1234567890_document.pdf",
      "is_shared": false,
      "folder_path": "documents",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 245
  }
}
```

### POST /api/files/upload

Upload a new file.

#### Request

```
POST /api/files/upload
Content-Type: multipart/form-data

{
  file: <File>,
  moduleId: "general",
  isShared: "false",
  folderPath: "documents"
}
```

#### Response Example

```json
{
  "success": true,
  "file": {
    "id": "file-uuid",
    "name": "document.pdf",
    "size": 1048576,
    "mime_type": "application/pdf",
    "storage_path": "files/tenant-id/general/user-id/1234567890_document.pdf",
    "tenant_id": "tenant-uuid",
    "module_id": "general",
    "uploaded_by": "user-uuid",
    "is_shared": false,
    "folder_path": "documents",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

#### Errors

- `400 Bad Request` - No file provided or file too large (>50MB)
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not associated with a tenant
- `500 Internal Server Error` - Upload failed

### GET /api/files/[id]

Get file details and download URL.

#### Request Example

```bash
GET /api/files/550e8400-e29b-41d4-a716-446655440000
```

#### Response Example

```json
{
  "file": {
    "id": "file-uuid",
    "name": "document.pdf",
    "size": 1048576,
    "mime_type": "application/pdf",
    "storage_path": "...",
    "tenant_id": "tenant-uuid",
    "module_id": "general",
    "uploaded_by": "user-uuid",
    "is_shared": false,
    "folder_path": "documents",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "downloadUrl": "https://...supabase.co/storage/v1/object/sign/..."
}
```

#### Errors

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User doesn't have access to this file
- `404 Not Found` - File not found
- `500 Internal Server Error` - Server error

### DELETE /api/files/[id]

Delete a file (owner or admin only).

#### Request Example

```bash
DELETE /api/files/550e8400-e29b-41d4-a716-446655440000
```

#### Response Example

```json
{
  "success": true
}
```

#### Errors

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User is not file owner or admin
- `404 Not Found` - File not found
- `500 Internal Server Error` - Server error

### PATCH /api/files/[id]

Update file metadata (move to folder).

#### Request Example

```bash
PATCH /api/files/550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "folderPath": "new-folder/subfolder"
}
```

#### Response Example

```json
{
  "success": true
}
```

#### Errors

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User is not file owner or admin
- `404 Not Found` - File not found
- `500 Internal Server Error` - Server error

## Search

### GET /api/search

Global search across users, modules, and settings.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |

#### Request Example

```bash
GET /api/search?q=john
```

#### Response Example

```json
{
  "results": [
    {
      "type": "user",
      "id": "user-uuid",
      "title": "John Doe",
      "description": "john@example.com",
      "url": "/admin/users/user-uuid",
      "metadata": {
        "role": "admin",
        "avatar_url": "https://..."
      }
    },
    {
      "type": "module",
      "id": "module-uuid",
      "title": "Analytics Module",
      "description": "Advanced analytics dashboard",
      "url": "/settings/modules/module-uuid",
      "metadata": {
        "is_enabled": true
      }
    }
  ]
}
```

#### Errors

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User not associated with a tenant
- `500 Internal Server Error` - Server error

## Error Responses

All API errors follow this structure:

### Standard Error Format

```json
{
  "error": "Error message",
  "status": 400
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Messages

#### Authentication Errors

```json
{
  "error": "Unauthorized",
  "status": 401
}
```

```json
{
  "error": "User not associated with a tenant",
  "status": 403
}
```

#### Validation Errors

```json
{
  "error": "Invalid request. Please check your input.",
  "status": 400
}
```

#### Permission Errors

```json
{
  "error": "You do not have permission to perform this action.",
  "status": 403
}
```

#### Not Found Errors

```json
{
  "error": "The requested resource was not found.",
  "status": 404
}
```

## Rate Limiting

API routes are subject to rate limiting:

- **Default**: 100 requests per minute per user
- **File Uploads**: 20 uploads per hour per user

When rate limit is exceeded:

```json
{
  "error": "Too many requests. Please try again later.",
  "status": 429
}
```

## Pagination

All list endpoints support pagination with `limit` and `offset` parameters.

### Request

```bash
GET /api/endpoint?limit=20&offset=40
```

### Response

```json
{
  "items": [...],
  "pagination": {
    "limit": 20,
    "offset": 40,
    "total": 250,
    "hasMore": true,
    "nextOffset": 60
  }
}
```

## Filtering

Many endpoints support filtering via query parameters.

### Examples

```bash
# Filter by type
GET /api/audit-logs?action_type=user.created

# Filter by date range
GET /api/audit-logs?from_date=2024-01-01T00:00:00Z&to_date=2024-01-31T23:59:59Z

# Filter by user
GET /api/audit-logs?user_id=user-uuid

# Combine multiple filters
GET /api/audit-logs?action_type=file.uploaded&from_date=2024-01-01T00:00:00Z&limit=100
```

## Best Practices

1. **Always handle errors gracefully** - Check status codes and display user-friendly messages
2. **Use pagination** - Don't fetch all records at once
3. **Implement retry logic** - For 429 and 5xx errors
4. **Cache responses** - Use React Query or similar for client-side caching
5. **Validate inputs** - Before sending requests
6. **Use TypeScript** - For type safety

## Example Usage

### React Query Hook

```typescript
import { useQuery } from '@tanstack/react-query'

export function useActivityFeed(scope: 'personal' | 'company') {
  return useQuery({
    queryKey: ['activities', scope],
    queryFn: async () => {
      const params = new URLSearchParams({ scope, limit: '20' })
      const response = await fetch(`/api/activity?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch activities')
      }

      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
  })
}
```

### File Upload

```typescript
async function uploadFile(file: File, moduleId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('moduleId', moduleId)
  formData.append('isShared', 'false')

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}
```

## Support

For API issues or questions:
- Create an issue on GitHub
- Email: support@example.com
- Check the [Architecture Guide](ARCHITECTURE.md) for system design details

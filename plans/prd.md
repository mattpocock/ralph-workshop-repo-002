# Link Shortener PRD

## Problem Statement

Users need a self-hosted link shortening solution with analytics, tagging, and API access. Existing solutions are either SaaS with recurring costs, lack analytics granularity, or don't provide API key management for programmatic access.

## Solution

A Next.js-based link shortener with:
- SQLite storage (portable, no external DB)
- Dummy user ID (auth deferred to later phase)
- Full CRUD for links and tags
- Aggregated click analytics with geo/device data
- API key management for programmatic access
- Rate limiting per API key
- Client-side QR code generation
- Static API documentation

## User Stories

1. ~~As a user, I want to sign in with Google, so that I can securely access my links~~ (deferred - using dummy user)
2. As a user, I want to create a shortened link with a random slug, so that I can share it quickly
3. As a user, I want to specify a custom slug when creating a link, so that I can have memorable URLs
4. As a user, I want to bulk create multiple links at once, so that I can save time when adding many links
5. As a user, I want to set an expiration date on a link, so that it automatically stops working after a certain time
6. As a user, I want to add tags to my links, so that I can organize them by category
7. As a user, I want to list all my links with pagination, so that I can browse large collections
8. As a user, I want to filter links by tag, so that I can find related links quickly
9. As a user, I want to update a link's destination URL, so that I can fix mistakes or redirect to new content
10. As a user, I want to update a link's tags, so that I can reorganize my links
11. As a user, I want to update a link's expiration, so that I can extend or shorten its lifespan
12. As a user, I want to delete a link, so that I can remove links I no longer need
13. As a user, I want deleted links to be soft-deleted, so that I can potentially recover them later
14. As a user, I want to visit /:slug and be redirected to the destination, so that shortened links work
15. As a user, I want expired links to show an error page, so that visitors know the link is no longer valid
16. As a user, I want to see click analytics for each link, so that I can understand link performance
17. As a user, I want to see which countries clicks came from, so that I can understand my audience geography
18. As a user, I want to see which devices/browsers were used, so that I can understand how people access my links
19. As a user, I want to see referrer data, so that I can understand where traffic comes from
20. As a user, I want to see click counts over time, so that I can identify trends
21. As a user, I want to create API keys, so that I can access the API programmatically
22. As a user, I want to list my API keys, so that I can manage them
23. As a user, I want to delete API keys, so that I can revoke access
24. As a user, I want API requests to be rate limited per key, so that abuse is prevented
25. As a user, I want rate limits to be configurable, so that I can adjust based on my needs
26. As a user, I want to create tags, so that I can organize links into categories
27. As a user, I want to list all my tags, so that I can see available categories
28. As a user, I want to delete tags, so that I can remove unused categories
29. As a user, I want to generate a QR code for any link, so that I can share links in print/physical contexts
30. As a user, I want to see API documentation, so that I can understand how to use the API
31. As a user, I want a health check endpoint, so that I can monitor the service status
32. As a user, I want a dark mode UI, so that I can use the app comfortably at night
33. As a user, I want to see my links in a table view, so that I can scan information quickly
34. ~~As a user, I want to only see my own links, so that my data is private from other users~~ (deferred - single dummy user for now)

## Implementation Decisions

### Database

- **better-sqlite3** for raw SQL (no ORM)
- In-memory SQLite for tests (isolation)
- Manual migrations stored as SQL files
- Soft deletes via `deleted_at` column on links and tags

### Schema (conceptual)

**users**: id, google_id, email, name, created_at (seed with dummy user `user_1` for now)

**links**: id, user_id, slug (unique), destination_url, expires_at, created_at, updated_at, deleted_at

**tags**: id, user_id, name, created_at, deleted_at

**link_tags**: link_id, tag_id (junction table)

**clicks** (aggregated): id, link_id, date, country, city, device_type, browser, os, referrer_domain, count

**api_keys**: id, user_id, key_hash, name, created_at, last_used_at

**rate_limit_log**: api_key_id, window_start, request_count

### Auth (Deferred)

- **Phase 1 (current):** Use hardcoded dummy user ID (`user_1`) for all operations
- **Phase 2 (future):** Auth.js v5 with Google provider, JWT sessions, route protection
- No login UI needed for now - all requests assumed to be from dummy user

### API Structure

All API routes under `/api/v1/`:

- `GET /api/v1/health` - Health check (public)
- `POST /api/v1/links` - Create link
- `POST /api/v1/links/bulk` - Bulk create links
- `GET /api/v1/links` - List links (paginated, filterable by tag)
- `GET /api/v1/links/:id` - Get single link with stats
- `PATCH /api/v1/links/:id` - Update link
- `DELETE /api/v1/links/:id` - Soft delete link
- `GET /api/v1/links/:id/stats` - Get detailed analytics
- `POST /api/v1/tags` - Create tag
- `GET /api/v1/tags` - List tags
- `DELETE /api/v1/tags/:id` - Soft delete tag
- `POST /api/v1/api-keys` - Create API key
- `GET /api/v1/api-keys` - List API keys
- `DELETE /api/v1/api-keys/:id` - Delete API key

### Validation

- Zod schemas for all request/response bodies
- Shared schemas between client and server

### Analytics

- ip-api.com for geo lookup (free tier: 45 req/min)
- ua-parser-js for user-agent parsing
- Clicks aggregated by: link_id + date + country + city + device_type + browser + os + referrer_domain
- Increment count on matching row, or insert new row

### Rate Limiting

- SQLite table tracks requests per API key per time window
- Configurable via environment variables (e.g., `RATE_LIMIT_MAX=100`, `RATE_LIMIT_WINDOW_MS=60000`)
- Returns 429 with Retry-After header when exceeded
- Only applies to /api/v1/* endpoints, not redirects

### QR Codes

- Client-side generation using qrcode library
- Generated on-demand when user clicks "QR Code" button
- No server storage

### UI

- shadcn/ui component library
- Sidebar navigation layout
- Table view for links list
- Dark mode via Tailwind class strategy
- Pages: Dashboard (links list), Link detail/edit, Tags, API Keys, Docs (Login deferred)

### Docs

- Static markdown files in /docs directory
- Rendered via Next.js pages at /docs/*
- Covers: Links API, Tags API, API Keys, Rate Limits, Errors (Authentication docs deferred)

## Testing Decisions

### Philosophy

- Test external behavior, not implementation details
- Tests should describe what the module does, not how
- Use in-memory SQLite for complete test isolation
- Each test gets a fresh database instance

### Modules to Test

**db module**
- Migration runs successfully
- Query helper returns expected results
- Connection pooling works correctly

**rate-limiter module**
- Allows requests under limit
- Blocks requests over limit
- Resets after window expires
- Handles concurrent requests correctly

**analytics module**
- Records clicks with correct aggregation
- Geo lookup parses response correctly
- UA parsing extracts device/browser/os
- Handles ip-api.com failures gracefully

**links module (business logic)**
- Slug generation produces unique slugs
- Expiration check identifies expired links
- Soft delete sets deleted_at without removing row
- Bulk create handles partial failures

**api-keys module (business logic)**
- Key generation produces secure random keys
- Key validation compares hashes correctly
- Last-used tracking updates on validation

### Prior Art

No existing tests in codebase. Will establish patterns with first tests.

## Out of Scope (This Phase)

- User authentication (Google OAuth) - deferred to phase 2
- Multi-user support - using dummy user for now
- Team/organization accounts
- Admin roles or user management
- Custom domains
- Link password protection
- A/B testing / split URLs
- Webhooks for events
- Import/export functionality
- Real-time analytics (websockets)
- Rate limiting on redirect routes
- Link click location map visualization
- Email notifications
- Two-factor authentication
- API key granular permissions
- Link preview/unfurl customization

## Further Notes

### Environment Variables Needed

```
DATABASE_PATH=./data/links.db
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
# Auth vars (for future phase):
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
# NEXTAUTH_SECRET=...
# NEXTAUTH_URL=http://localhost:3000
```

### Dependencies to Add

- better-sqlite3
- zod
- ua-parser-js
- qrcode (client-side)
- shadcn/ui components
- @types/better-sqlite3
- vitest
- next-auth (Auth.js) - deferred to auth phase

### Redirect Route

The `/:slug` redirect will be handled by a catch-all route that:
1. Looks up slug in database
2. Checks expiration
3. Records click asynchronously (non-blocking)
4. Returns 302 redirect or 410 Gone for expired/deleted

### Performance Considerations

- Click recording should not block redirect response
- Consider indexing: links.slug, links.user_id, clicks.link_id+date
- Rate limit checks should be fast (indexed by api_key_id + window_start)

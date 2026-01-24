export const metadata = {
  title: "API Documentation - Link Shortener",
  description: "API reference for the Link Shortener service",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
      <article className="max-w-4xl mx-auto prose prose-zinc dark:prose-invert prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:text-zinc-800 dark:prose-pre:text-zinc-200">
        <h1>API Documentation</h1>

        <p>
          The Link Shortener API provides programmatic access to create, manage,
          and track shortened links. All API endpoints are available under{" "}
          <code>/api/v1/</code>.
        </p>

        <h2>Authentication</h2>
        <p>
          API requests can be authenticated using an API key. Include the key in
          the <code>X-API-Key</code> header:
        </p>
        <pre>
          <code>X-API-Key: rlk_your_api_key_here</code>
        </pre>

        <h2>Rate Limiting</h2>
        <p>
          API requests are rate limited per API key. The default limit is 100
          requests per minute. Rate limit information is included in response
          headers:
        </p>
        <ul>
          <li>
            <code>X-RateLimit-Limit</code>: Maximum requests per window
          </li>
          <li>
            <code>X-RateLimit-Remaining</code>: Remaining requests in current
            window
          </li>
          <li>
            <code>X-RateLimit-Reset</code>: Unix timestamp when the window
            resets
          </li>
        </ul>
        <p>
          When rate limited, the API returns <code>429 Too Many Requests</code>{" "}
          with a <code>Retry-After</code> header.
        </p>

        <hr />

        <h2>Health Check</h2>

        <h3>
          <code>GET /api/v1/health</code>
        </h3>
        <p>Check the service status and database connectivity.</p>

        <h4>Response</h4>
        <pre>
          <code>{`{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}`}</code>
        </pre>

        <hr />

        <h2>Links</h2>

        <h3>
          <code>POST /api/v1/links</code>
        </h3>
        <p>Create a new shortened link.</p>

        <h4>Request Body</h4>
        <pre>
          <code>{`{
  "destinationUrl": "https://example.com",  // Required: URL to redirect to
  "slug": "my-link",                         // Optional: Custom slug (auto-generated if omitted)
  "expiresAt": "2024-12-31T23:59:59Z"       // Optional: Expiration date (ISO 8601)
}`}</code>
        </pre>

        <h4>Response (201 Created)</h4>
        <pre>
          <code>{`{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "my-link",
  "destinationUrl": "https://example.com",
  "shortUrl": "http://localhost:3000/my-link",
  "expiresAt": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}`}</code>
        </pre>

        <h4>Errors</h4>
        <ul>
          <li>
            <code>400</code>: Validation failed (invalid URL, slug format, or
            expiration date)
          </li>
          <li>
            <code>409</code>: A link with this slug already exists
          </li>
        </ul>

        <h3>
          <code>POST /api/v1/links/bulk</code>
        </h3>
        <p>Create multiple links at once (1-100 links per request).</p>

        <h4>Request Body</h4>
        <pre>
          <code>{`{
  "links": [
    { "destinationUrl": "https://example1.com" },
    { "destinationUrl": "https://example2.com", "slug": "custom" }
  ]
}`}</code>
        </pre>

        <h4>Response (201/207)</h4>
        <pre>
          <code>{`{
  "results": [
    { "index": 0, "success": true, "link": { ... } },
    { "index": 1, "success": false, "error": "A link with this slug already exists" }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}`}</code>
        </pre>
        <p>
          Returns <code>201</code> if all succeed, <code>207 Multi-Status</code>{" "}
          for partial success, <code>400</code> if all fail.
        </p>

        <h3>
          <code>GET /api/v1/links</code>
        </h3>
        <p>List all links with pagination.</p>

        <h4>Query Parameters</h4>
        <ul>
          <li>
            <code>limit</code>: Number of links to return (1-100, default: 20)
          </li>
          <li>
            <code>offset</code>: Number of links to skip (default: 0)
          </li>
          <li>
            <code>tag</code>: Filter by tag ID (UUID)
          </li>
        </ul>

        <h4>Response</h4>
        <pre>
          <code>{`{
  "links": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "slug": "my-link",
      "destinationUrl": "https://example.com",
      "shortUrl": "http://localhost:3000/my-link",
      "expiresAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}`}</code>
        </pre>

        <h3>
          <code>GET /api/v1/links/:id</code>
        </h3>
        <p>Get a single link by ID.</p>

        <h4>Response</h4>
        <p>Returns the link object (same structure as create response).</p>

        <h4>Errors</h4>
        <ul>
          <li>
            <code>404</code>: Link not found
          </li>
        </ul>

        <h3>
          <code>PATCH /api/v1/links/:id</code>
        </h3>
        <p>Update a link's destination URL or expiration.</p>

        <h4>Request Body</h4>
        <pre>
          <code>{`{
  "destinationUrl": "https://new-url.com",  // Optional
  "expiresAt": "2025-12-31T23:59:59Z"       // Optional (set to null to remove expiration)
}`}</code>
        </pre>

        <h4>Response</h4>
        <p>Returns the updated link object.</p>

        <h3>
          <code>DELETE /api/v1/links/:id</code>
        </h3>
        <p>
          Soft delete a link. The link will no longer redirect but can
          potentially be recovered.
        </p>

        <h4>Response</h4>
        <p>
          <code>204 No Content</code> on success.
        </p>

        <h3>
          <code>GET /api/v1/links/:id/stats</code>
        </h3>
        <p>Get detailed click analytics for a link.</p>

        <h4>Response</h4>
        <pre>
          <code>{`{
  "totalClicks": 1234,
  "clicksByDate": [
    { "date": "2024-01-15", "count": 100 },
    { "date": "2024-01-14", "count": 85 }
  ],
  "clicksByCountry": [
    { "country": "US", "count": 500 },
    { "country": "GB", "count": 200 }
  ],
  "clicksByDevice": [
    { "device_type": "mobile", "count": 600 },
    { "device_type": "desktop", "count": 400 }
  ],
  "clicksByBrowser": [
    { "browser": "Chrome", "count": 700 },
    { "browser": "Safari", "count": 300 }
  ],
  "clicksByOs": [
    { "os": "iOS", "count": 400 },
    { "os": "Windows", "count": 350 }
  ],
  "clicksByReferrer": [
    { "referrer_domain": "google.com", "count": 200 },
    { "referrer_domain": null, "count": 150 }
  ]
}`}</code>
        </pre>

        <hr />

        <h2>Link Tags</h2>

        <h3>
          <code>GET /api/v1/links/:id/tags</code>
        </h3>
        <p>Get all tags for a link.</p>

        <h4>Response</h4>
        <pre>
          <code>{`{
  "tags": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "marketing",
      "createdAt": "2024-01-10T08:00:00.000Z"
    }
  ]
}`}</code>
        </pre>

        <h3>
          <code>POST /api/v1/links/:id/tags</code>
        </h3>
        <p>Add tags to a link.</p>

        <h4>Request Body</h4>
        <pre>
          <code>{`{
  "tagIds": ["660e8400-e29b-41d4-a716-446655440000"]
}`}</code>
        </pre>

        <h4>Response (201 Created)</h4>
        <p>
          Returns the updated list of tags for the link (same structure as GET).
        </p>

        <h3>
          <code>PUT /api/v1/links/:id/tags</code>
        </h3>
        <p>Replace all tags on a link.</p>

        <h4>Request Body</h4>
        <pre>
          <code>{`{
  "tagIds": ["660e8400-e29b-41d4-a716-446655440000"]
}`}</code>
        </pre>

        <h4>Response</h4>
        <p>Returns the updated list of tags for the link.</p>

        <h3>
          <code>DELETE /api/v1/links/:id/tags/:tagId</code>
        </h3>
        <p>Remove a tag from a link.</p>

        <h4>Response</h4>
        <p>
          <code>204 No Content</code> on success.
        </p>

        <hr />

        <h2>Tags</h2>

        <h3>
          <code>POST /api/v1/tags</code>
        </h3>
        <p>Create a new tag.</p>

        <h4>Request Body</h4>
        <pre>
          <code>{`{
  "name": "marketing"  // 1-50 characters, alphanumeric/spaces/underscores/hyphens
}`}</code>
        </pre>

        <h4>Response (201 Created)</h4>
        <pre>
          <code>{`{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "name": "marketing",
  "createdAt": "2024-01-15T10:30:00.000Z"
}`}</code>
        </pre>

        <h4>Errors</h4>
        <ul>
          <li>
            <code>400</code>: Validation failed (invalid name format)
          </li>
          <li>
            <code>409</code>: A tag with this name already exists
          </li>
        </ul>

        <h3>
          <code>GET /api/v1/tags</code>
        </h3>
        <p>List all tags.</p>

        <h4>Response</h4>
        <pre>
          <code>{`{
  "tags": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "name": "marketing",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}`}</code>
        </pre>

        <h3>
          <code>DELETE /api/v1/tags/:id</code>
        </h3>
        <p>Soft delete a tag.</p>

        <h4>Response</h4>
        <p>
          <code>204 No Content</code> on success.
        </p>

        <hr />

        <h2>API Keys</h2>

        <h3>
          <code>POST /api/v1/api-keys</code>
        </h3>
        <p>Create a new API key.</p>

        <h4>Request Body</h4>
        <pre>
          <code>{`{
  "name": "My Integration"  // 1-100 characters
}`}</code>
        </pre>

        <h4>Response (201 Created)</h4>
        <pre>
          <code>{`{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "name": "My Integration",
  "key": "rlk_abc123...",  // Only shown once!
  "createdAt": "2024-01-15T10:30:00.000Z",
  "lastUsedAt": null
}`}</code>
        </pre>
        <p>
          <strong>Important:</strong> The <code>key</code> field is only
          returned when the API key is created. Store it securely as it cannot
          be retrieved later.
        </p>

        <h3>
          <code>GET /api/v1/api-keys</code>
        </h3>
        <p>List all API keys (without exposing the key values).</p>

        <h4>Response</h4>
        <pre>
          <code>{`{
  "apiKeys": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "name": "My Integration",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastUsedAt": "2024-01-15T12:00:00.000Z"
    }
  ]
}`}</code>
        </pre>

        <h3>
          <code>DELETE /api/v1/api-keys/:id</code>
        </h3>
        <p>Delete an API key. This immediately revokes access for that key.</p>

        <h4>Response</h4>
        <p>
          <code>204 No Content</code> on success.
        </p>

        <hr />

        <h2>Errors</h2>

        <p>All error responses follow this format:</p>
        <pre>
          <code>{`{
  "error": "Error message",
  "details": [  // Optional, included for validation errors
    { "field": "destinationUrl", "message": "Invalid URL format" }
  ]
}`}</code>
        </pre>

        <h3>HTTP Status Codes</h3>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>200</code>
              </td>
              <td>Success</td>
            </tr>
            <tr>
              <td>
                <code>201</code>
              </td>
              <td>Created</td>
            </tr>
            <tr>
              <td>
                <code>204</code>
              </td>
              <td>No Content (successful delete)</td>
            </tr>
            <tr>
              <td>
                <code>207</code>
              </td>
              <td>Multi-Status (bulk operations with partial success)</td>
            </tr>
            <tr>
              <td>
                <code>400</code>
              </td>
              <td>Bad Request (validation error)</td>
            </tr>
            <tr>
              <td>
                <code>401</code>
              </td>
              <td>Unauthorized (invalid API key)</td>
            </tr>
            <tr>
              <td>
                <code>404</code>
              </td>
              <td>Not Found</td>
            </tr>
            <tr>
              <td>
                <code>409</code>
              </td>
              <td>Conflict (duplicate slug or tag name)</td>
            </tr>
            <tr>
              <td>
                <code>429</code>
              </td>
              <td>Too Many Requests (rate limited)</td>
            </tr>
            <tr>
              <td>
                <code>500</code>
              </td>
              <td>Internal Server Error</td>
            </tr>
            <tr>
              <td>
                <code>503</code>
              </td>
              <td>Service Unavailable (health check failed)</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}

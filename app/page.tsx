"use client";

import { useEffect, useState } from "react";
import type { ListLinksResponse, LinkResponse } from "@/lib/links";

export default function Dashboard() {
  const [data, setData] = useState<ListLinksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLinks() {
      try {
        const response = await fetch("/api/v1/links");
        if (!response.ok) {
          throw new Error(`Failed to fetch links: ${response.status}`);
        }
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchLinks();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Links
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {data?.pagination.total ?? 0} total links
          </p>
        </header>

        {data?.links.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            No links yet. Create your first link to get started.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 dark:bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Short URL
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Destination
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Created
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data?.links.map((link: LinkResponse) => (
                  <LinkRow key={link.id} link={link} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.pagination.hasMore && (
          <div className="mt-4 text-center">
            <p className="text-sm text-zinc-500">
              Showing {data.links.length} of {data.pagination.total} links
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LinkRow({ link }: { link: LinkResponse }) {
  const createdDate = new Date(link.createdAt).toLocaleDateString();
  const expiresDate = link.expiresAt
    ? new Date(link.expiresAt).toLocaleDateString()
    : null;

  return (
    <tr className="bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900">
      <td className="px-4 py-3">
        <a
          href={link.shortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm"
        >
          /{link.slug}
        </a>
      </td>
      <td className="px-4 py-3">
        <a
          href={link.destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-700 dark:text-zinc-300 hover:underline text-sm truncate block max-w-md"
          title={link.destinationUrl}
        >
          {link.destinationUrl}
        </a>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
        {createdDate}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
        {expiresDate ?? (
          <span className="text-zinc-400 dark:text-zinc-600">Never</span>
        )}
      </td>
    </tr>
  );
}

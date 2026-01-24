"use client";

import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";
import type { ListLinksResponse, LinkResponse } from "@/lib/links";

function useDarkMode() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      setIsDark(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return next;
    });
  }, []);

  return { isDark, toggle, mounted };
}

export default function Dashboard() {
  const [data, setData] = useState<ListLinksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrModal, setQrModal] = useState<{
    url: string;
    slug: string;
    dataUrl: string;
  } | null>(null);
  const { isDark, toggle: toggleDarkMode, mounted } = useDarkMode();

  const generateQrCode = useCallback(async (url: string, slug: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrModal({ url, slug, dataUrl });
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  }, []);

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
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Links
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              {data?.pagination.total ?? 0} total links
            </p>
          </div>
          {mounted && (
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label={
                isDark ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDark ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              )}
            </button>
          )}
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
                  <th className="px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {data?.links.map((link: LinkResponse) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    onQrCode={() => generateQrCode(link.shortUrl, link.slug)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {qrModal && (
          <QrCodeModal
            url={qrModal.url}
            slug={qrModal.slug}
            dataUrl={qrModal.dataUrl}
            onClose={() => setQrModal(null)}
          />
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

function LinkRow({
  link,
  onQrCode,
}: {
  link: LinkResponse;
  onQrCode: () => void;
}) {
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
      <td className="px-4 py-3">
        <button
          onClick={onQrCode}
          className="px-3 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          QR Code
        </button>
      </td>
    </tr>
  );
}

function QrCodeModal({
  url,
  slug,
  dataUrl,
  onClose,
}: {
  url: string;
  slug: string;
  dataUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            QR Code for /{slug}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            &times;
          </button>
        </div>
        <div className="flex justify-center mb-4">
          <img src={dataUrl} alt={`QR code for ${url}`} className="w-64 h-64" />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center break-all">
          {url}
        </p>
        <div className="mt-4 flex justify-center">
          <a
            href={dataUrl}
            download={`qr-${slug}.png`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Download PNG
          </a>
        </div>
      </div>
    </div>
  );
}

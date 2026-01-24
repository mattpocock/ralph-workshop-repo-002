import type Database from "better-sqlite3";
import crypto from "crypto";

export interface ClickAnalytics {
  id: string;
  link_id: string;
  date: string;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer_domain: string | null;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecordClickInput {
  linkId: string;
  country?: string | null;
  city?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  referrerDomain?: string | null;
}

/**
 * Records a click for a link
 * Uses upsert pattern - increments click_count if row exists, otherwise inserts new row
 */
export function recordClick(
  db: Database.Database,
  input: RecordClickInput,
): void {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  // Normalize null values for the unique constraint
  const country = input.country || null;
  const city = input.city || null;
  const deviceType = input.deviceType || null;
  const browser = input.browser || null;
  const os = input.os || null;
  const referrerDomain = input.referrerDomain || null;

  // Try to update existing row first
  const updateStmt = db.prepare(`
    UPDATE click_analytics
    SET click_count = click_count + 1, updated_at = datetime('now')
    WHERE link_id = ? AND date = ?
      AND COALESCE(country, '') = COALESCE(?, '')
      AND COALESCE(city, '') = COALESCE(?, '')
      AND COALESCE(device_type, '') = COALESCE(?, '')
      AND COALESCE(browser, '') = COALESCE(?, '')
      AND COALESCE(os, '') = COALESCE(?, '')
      AND COALESCE(referrer_domain, '') = COALESCE(?, '')
  `);

  const result = updateStmt.run(
    input.linkId,
    date,
    country,
    city,
    deviceType,
    browser,
    os,
    referrerDomain,
  );

  // If no row was updated, insert a new one
  if (result.changes === 0) {
    const id = crypto.randomUUID();
    const insertStmt = db.prepare(`
      INSERT INTO click_analytics (id, link_id, date, country, city, device_type, browser, os, referrer_domain, click_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertStmt.run(
      id,
      input.linkId,
      date,
      country,
      city,
      deviceType,
      browser,
      os,
      referrerDomain,
    );
  }
}

export interface ClickStats {
  totalClicks: number;
  clicksByDate: { date: string; count: number }[];
  clicksByCountry: { country: string | null; count: number }[];
  clicksByDevice: { device_type: string | null; count: number }[];
  clicksByBrowser: { browser: string | null; count: number }[];
  clicksByOs: { os: string | null; count: number }[];
  clicksByReferrer: { referrer_domain: string | null; count: number }[];
}

/**
 * Gets aggregated click statistics for a link
 */
export function getClickStats(
  db: Database.Database,
  linkId: string,
): ClickStats {
  // Total clicks
  const totalStmt = db.prepare(`
    SELECT COALESCE(SUM(click_count), 0) as total FROM click_analytics WHERE link_id = ?
  `);
  const { total: totalClicks } = totalStmt.get(linkId) as { total: number };

  // Clicks by date
  const dateStmt = db.prepare(`
    SELECT date, SUM(click_count) as count
    FROM click_analytics
    WHERE link_id = ?
    GROUP BY date
    ORDER BY date DESC
  `);
  const clicksByDate = dateStmt.all(linkId) as {
    date: string;
    count: number;
  }[];

  // Clicks by country
  const countryStmt = db.prepare(`
    SELECT country, SUM(click_count) as count
    FROM click_analytics
    WHERE link_id = ?
    GROUP BY country
    ORDER BY count DESC
  `);
  const clicksByCountry = countryStmt.all(linkId) as {
    country: string | null;
    count: number;
  }[];

  // Clicks by device type
  const deviceStmt = db.prepare(`
    SELECT device_type, SUM(click_count) as count
    FROM click_analytics
    WHERE link_id = ?
    GROUP BY device_type
    ORDER BY count DESC
  `);
  const clicksByDevice = deviceStmt.all(linkId) as {
    device_type: string | null;
    count: number;
  }[];

  // Clicks by browser
  const browserStmt = db.prepare(`
    SELECT browser, SUM(click_count) as count
    FROM click_analytics
    WHERE link_id = ?
    GROUP BY browser
    ORDER BY count DESC
  `);
  const clicksByBrowser = browserStmt.all(linkId) as {
    browser: string | null;
    count: number;
  }[];

  // Clicks by OS
  const osStmt = db.prepare(`
    SELECT os, SUM(click_count) as count
    FROM click_analytics
    WHERE link_id = ?
    GROUP BY os
    ORDER BY count DESC
  `);
  const clicksByOs = osStmt.all(linkId) as {
    os: string | null;
    count: number;
  }[];

  // Clicks by referrer domain
  const referrerStmt = db.prepare(`
    SELECT referrer_domain, SUM(click_count) as count
    FROM click_analytics
    WHERE link_id = ?
    GROUP BY referrer_domain
    ORDER BY count DESC
  `);
  const clicksByReferrer = referrerStmt.all(linkId) as {
    referrer_domain: string | null;
    count: number;
  }[];

  return {
    totalClicks,
    clicksByDate,
    clicksByCountry,
    clicksByDevice,
    clicksByBrowser,
    clicksByOs,
    clicksByReferrer,
  };
}

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { getTestDb, runMigrations } from "../db";
import { recordClick, getClickStats } from "./repository";
import { createLink } from "../links";

describe("click analytics", () => {
  let testDb: Database.Database;
  let testLinkId: string;

  beforeEach(() => {
    testDb = getTestDb();
    runMigrations(testDb);

    // Create a test link for analytics
    const link = createLink(testDb, {
      userId: "user_1",
      destinationUrl: "https://example.com",
      slug: "test-analytics",
    });
    testLinkId = link.id;
  });

  afterEach(() => {
    testDb.close();
  });

  describe("recordClick", () => {
    it("records a basic click", () => {
      recordClick(testDb, { linkId: testLinkId });

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.totalClicks).toBe(1);
    });

    it("records a click with all metadata", () => {
      recordClick(testDb, {
        linkId: testLinkId,
        country: "US",
        city: "New York",
        deviceType: "desktop",
        browser: "Chrome",
        os: "Windows",
        referrerDomain: "google.com",
      });

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.totalClicks).toBe(1);
      expect(stats.clicksByCountry).toContainEqual({ country: "US", count: 1 });
      expect(stats.clicksByBrowser).toContainEqual({
        browser: "Chrome",
        count: 1,
      });
    });

    it("aggregates multiple clicks with same metadata", () => {
      recordClick(testDb, { linkId: testLinkId, country: "US" });
      recordClick(testDb, { linkId: testLinkId, country: "US" });
      recordClick(testDb, { linkId: testLinkId, country: "US" });

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.totalClicks).toBe(3);
      expect(stats.clicksByCountry).toContainEqual({ country: "US", count: 3 });
    });

    it("separates clicks with different metadata", () => {
      recordClick(testDb, { linkId: testLinkId, country: "US" });
      recordClick(testDb, { linkId: testLinkId, country: "UK" });

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.totalClicks).toBe(2);
      expect(stats.clicksByCountry).toContainEqual({ country: "US", count: 1 });
      expect(stats.clicksByCountry).toContainEqual({ country: "UK", count: 1 });
    });

    it("handles null values in metadata", () => {
      recordClick(testDb, { linkId: testLinkId });
      recordClick(testDb, { linkId: testLinkId });

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.totalClicks).toBe(2);
      expect(stats.clicksByCountry).toContainEqual({ country: null, count: 2 });
    });
  });

  describe("getClickStats", () => {
    it("returns zero stats for link with no clicks", () => {
      const stats = getClickStats(testDb, testLinkId);

      expect(stats.totalClicks).toBe(0);
      expect(stats.clicksByDate).toEqual([]);
      expect(stats.clicksByCountry).toEqual([]);
    });

    it("returns clicks grouped by date", () => {
      // Insert clicks with different dates directly
      testDb
        .prepare(
          `INSERT INTO click_analytics (id, link_id, date, click_count)
           VALUES (?, ?, ?, ?)`,
        )
        .run("id1", testLinkId, "2024-01-15", 5);
      testDb
        .prepare(
          `INSERT INTO click_analytics (id, link_id, date, click_count)
           VALUES (?, ?, ?, ?)`,
        )
        .run("id2", testLinkId, "2024-01-16", 3);

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.totalClicks).toBe(8);
      expect(stats.clicksByDate).toHaveLength(2);
      expect(stats.clicksByDate).toContainEqual({
        date: "2024-01-15",
        count: 5,
      });
      expect(stats.clicksByDate).toContainEqual({
        date: "2024-01-16",
        count: 3,
      });
    });

    it("returns clicks grouped by device type", () => {
      recordClick(testDb, { linkId: testLinkId, deviceType: "desktop" });
      recordClick(testDb, { linkId: testLinkId, deviceType: "desktop" });
      recordClick(testDb, { linkId: testLinkId, deviceType: "mobile" });

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.clicksByDevice).toContainEqual({
        device_type: "desktop",
        count: 2,
      });
      expect(stats.clicksByDevice).toContainEqual({
        device_type: "mobile",
        count: 1,
      });
    });

    it("returns clicks grouped by OS", () => {
      recordClick(testDb, { linkId: testLinkId, os: "Windows" });
      recordClick(testDb, { linkId: testLinkId, os: "macOS" });
      recordClick(testDb, { linkId: testLinkId, os: "Linux" });

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.clicksByOs).toHaveLength(3);
    });

    it("returns clicks grouped by referrer", () => {
      recordClick(testDb, { linkId: testLinkId, referrerDomain: "google.com" });
      recordClick(testDb, { linkId: testLinkId, referrerDomain: "google.com" });
      recordClick(testDb, {
        linkId: testLinkId,
        referrerDomain: "twitter.com",
      });
      recordClick(testDb, { linkId: testLinkId }); // direct traffic (null referrer)

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.clicksByReferrer).toContainEqual({
        referrer_domain: "google.com",
        count: 2,
      });
      expect(stats.clicksByReferrer).toContainEqual({
        referrer_domain: "twitter.com",
        count: 1,
      });
      expect(stats.clicksByReferrer).toContainEqual({
        referrer_domain: null,
        count: 1,
      });
    });

    it("only returns stats for the specified link", () => {
      // Create another link
      const otherLink = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://other.com",
        slug: "other-link",
      });

      recordClick(testDb, { linkId: testLinkId });
      recordClick(testDb, { linkId: testLinkId });
      recordClick(testDb, { linkId: otherLink.id });

      const stats = getClickStats(testDb, testLinkId);
      expect(stats.totalClicks).toBe(2);

      const otherStats = getClickStats(testDb, otherLink.id);
      expect(otherStats.totalClicks).toBe(1);
    });

    it("returns stats for link with no clicks (empty arrays)", () => {
      const stats = getClickStats(testDb, testLinkId);

      expect(stats.totalClicks).toBe(0);
      expect(stats.clicksByDate).toEqual([]);
      expect(stats.clicksByCountry).toEqual([]);
      expect(stats.clicksByDevice).toEqual([]);
      expect(stats.clicksByBrowser).toEqual([]);
      expect(stats.clicksByOs).toEqual([]);
      expect(stats.clicksByReferrer).toEqual([]);
    });
  });
});

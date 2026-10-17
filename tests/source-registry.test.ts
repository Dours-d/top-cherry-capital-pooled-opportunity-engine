import { describe, expect, it } from "vitest";

import {
  CONTEXT_DOMAINS,
  SOURCE_REGISTRY,
  summarizeSourceCoverage,
  type SourceCoverage,
} from "../shared/source-registry";

describe("economic source registry", () => {
  it("covers every inventory domain with at least one enabled source", () => {
    for (const domain of CONTEXT_DOMAINS) {
      expect(SOURCE_REGISTRY.some((source) => source.domain === domain.id && source.enabled), domain.id).toBe(true);
    }
  });

  it("distinguishes covered, partial, stale, blocked and not-started evidence", () => {
    const coverage: SourceCoverage[] = [
      { sourceId: "ecb-data", latestObservationAt: "2026-10-16T00:00:00.000Z", latestPublishedAt: "2026-10-16T00:00:00.000Z", status: "covered", note: "Current series", observationCount: 10 },
      { sourceId: "iea-data", latestObservationAt: "2026-10-01T00:00:00.000Z", latestPublishedAt: "2026-10-01T00:00:00.000Z", status: "partial", note: "Proxy only", observationCount: 2 },
      { sourceId: "ecb-transmission", latestObservationAt: "2026-01-01T00:00:00.000Z", latestPublishedAt: "2026-01-01T00:00:00.000Z", status: "covered", note: "Old mechanism reference", observationCount: 1 },
      { sourceId: "eu-dual-use", latestObservationAt: null, latestPublishedAt: null, status: "blocked", note: "Classification missing", observationCount: 0 },
    ];
    const result = summarizeSourceCoverage({ registry: SOURCE_REGISTRY, coverage, asOf: "2026-10-17T00:00:00.000Z", staleAfterDays: 30 });
    expect(result.counts.covered).toBeGreaterThan(0);
    expect(result.counts.partial).toBeGreaterThan(0);
    expect(result.counts.stale).toBeGreaterThan(0);
    expect(result.counts.blocked).toBeGreaterThan(0);
    expect(result.counts.notStarted).toBeGreaterThan(0);
    expect(result.domains.find((item) => item.domain === "financial-wealth")?.status).toBe("covered");
    expect(result.domains.find((item) => item.domain === "geopolitics-sanctions")?.status).toBe("blocked");
  });

  it("does not treat a proxy-only source as covered", () => {
    const result = summarizeSourceCoverage({
      registry: SOURCE_REGISTRY,
      coverage: [{ sourceId: "iea-data", latestObservationAt: "2026-10-16T00:00:00.000Z", latestPublishedAt: "2026-10-16T00:00:00.000Z", status: "proxy-only", note: "Benchmark only", observationCount: 1 }],
      asOf: "2026-10-17T00:00:00.000Z",
      staleAfterDays: 30,
    });
    expect(result.domains.find((item) => item.domain === "commodities-energy")?.status).toBe("partial");
  });
});

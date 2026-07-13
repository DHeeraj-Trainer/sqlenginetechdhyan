// k6 load test — 3000 concurrent students on the SQL Workbench.
//
// Install k6: https://k6.io/docs/get-started/installation/
//   macOS: brew install k6
//   Linux: (see docs)
//
// Run against your deployed Lovable app (NOT the sandbox):
//   BASE_URL=https://your-app.lovable.app k6 run scripts/k6-load-test.js
//
// Or a shorter smoke run:
//   BASE_URL=https://your-app.lovable.app k6 run --vus 100 --duration 30s scripts/k6-load-test.js
//
// Report is written to k6-summary.json and printed to stdout.

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

// Custom metrics for surfacing in the report
const homeDuration = new Trend("home_duration_ms", true);
const sharedDuration = new Trend("shared_duration_ms", true);
const authDuration = new Trend("auth_duration_ms", true);
const failureRate = new Rate("failed_requests");
const nonOk = new Counter("non_2xx_responses");

// Realistic profile: ramp to 3000 VUs, hold, ramp down.
// A "student" viewer sends ~3–4 requests per iteration with think time.
export const options = {
  scenarios: {
    students: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 500 },   // warm up
        { duration: "2m", target: 1500 },  // ramp
        { duration: "2m", target: 3000 },  // hit target
        { duration: "3m", target: 3000 },  // hold
        { duration: "1m", target: 0 },     // ramp down
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    // P95 under 1.5s for the home page, P99 under 3s.
    "home_duration_ms": ["p(95)<1500", "p(99)<3000"],
    "shared_duration_ms": ["p(95)<1200"],
    "auth_duration_ms": ["p(95)<1000"],
    // Fewer than 1% of requests should fail.
    "failed_requests": ["rate<0.01"],
    // Global: 95% of requests under 2s.
    "http_req_duration": ["p(95)<2000"],
  },
  discardResponseBodies: true,
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function record(res, trend) {
  trend.add(res.timings.duration);
  const ok = res.status >= 200 && res.status < 400;
  failureRate.add(!ok);
  if (!ok) nonOk.add(1);
  return ok;
}

export default function () {
  group("home", () => {
    const res = http.get(`${BASE_URL}/`, {
      headers: { "user-agent": "k6-load-test/1.0" },
      tags: { page: "home" },
    });
    const ok = record(res, homeDuration);
    check(res, {
      "home 200": (r) => r.status === 200,
      "not an SSR 500 payload": () => ok,
    });
  });

  sleep(2 + Math.random() * 3);

  group("auth-page", () => {
    const res = http.get(`${BASE_URL}/auth`, { tags: { page: "auth" } });
    record(res, authDuration);
    check(res, { "auth 200": (r) => r.status === 200 });
  });

  sleep(1 + Math.random() * 2);

  // Hit a public share slug if provided — proves the /s/$slug SSR cache is
  // absorbing traffic. Skip when SHARE_SLUG is not set.
  const slug = __ENV.SHARE_SLUG;
  if (slug) {
    group("shared", () => {
      const res = http.get(`${BASE_URL}/s/${slug}`, { tags: { page: "shared" } });
      record(res, sharedDuration);
      check(res, {
        "shared 200": (r) => r.status === 200,
        "cache-control set": (r) => !!r.headers["Cache-Control"],
      });
    });
    sleep(1);
  }
}

export function handleSummary(data) {
  return {
    "k6-summary.json": JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const line = (label, key) => {
    const t = m[key];
    if (!t || !t.values) return `${label.padEnd(28)} —`;
    const v = t.values;
    return `${label.padEnd(28)} avg=${(v.avg ?? 0).toFixed(0)}ms p95=${(v["p(95)"] ?? 0).toFixed(0)}ms p99=${(v["p(99)"] ?? 0).toFixed(0)}ms max=${(v.max ?? 0).toFixed(0)}ms`;
  };
  const rate = (label, key) => {
    const r = m[key];
    if (!r || !r.values) return `${label.padEnd(28)} —`;
    return `${label.padEnd(28)} ${(r.values.rate * 100).toFixed(2)}%`;
  };
  return [
    "",
    "=== Load-test report ===",
    line("Home page duration", "home_duration_ms"),
    line("/auth page duration", "auth_duration_ms"),
    line("/s/$slug duration", "shared_duration_ms"),
    line("http_req_duration", "http_req_duration"),
    rate("Failed requests", "failed_requests"),
    `Non-2xx responses           ${m.non_2xx_responses?.values?.count ?? 0}`,
    `Iterations                  ${m.iterations?.values?.count ?? 0}`,
    `VUs (max)                   ${m.vus_max?.values?.max ?? 0}`,
    "",
  ].join("\n");
}

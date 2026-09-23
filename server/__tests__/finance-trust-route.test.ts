import assert from "node:assert/strict";
import express from "express";
import { createServer, request as httpRequest } from "node:http";
import { describe, it } from "node:test";
import { registerRoutes } from "../routes";

function request(server: ReturnType<typeof createServer>, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; json: any }>((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === "string") return reject(new Error("server did not bind"));
    const req = httpRequest({ hostname: "127.0.0.1", port: address.port, path, method, headers: { "content-type": "application/json", ...headers } }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode || 0, json: text ? JSON.parse(text) : null }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

describe("Finance trust route boundary", () => {
  it("uses injected storage for normalized obligations and rejects invalid writes", async () => {
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    const fakeStore: any = {
      markBillsPoolAsExcluded: async () => undefined,
      getPlaidConnections: async () => [],
      getBillSchedule: async () => [{ id: 7, name: "Rent", amount: "1200", dueDay: 31, category: "Housing", isVariable: false, autopay: true, notes: null, frequency: "monthly", endOfMonth: true, active: true }],
      getTransactions: async () => [],
      getDebtsWithPayments: async () => [],
      getBudgetSettings: async () => ({
        bufferGoalAmount: "1000",
        myAllowance: "250",
        spouseAllowance: "125",
        personalFlexPercent: "10",
        personalFlexMeSplitPct: "50",
        avgWindowWeeks: 6,
        groceryBudgetOverride: "120",
        fuelBudgetOverride: "75",
      }),
      computeTotalCash: async () => 2000,
    };
    await registerRoutes(server, app, fakeStore);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    try {
      const obligations = await request(server, "GET", "/api/finance/obligations");
      assert.equal(obligations.status, 200);
      assert.equal(obligations.json[0].source, "bill_schedule_compat");
      assert.equal(obligations.json[0].frequency, "monthly");

      const summary = await request(server, "GET", "/api/finance/trust-summary");
      assert.equal(summary.status, 200);
      assert.equal(summary.json.personalFlex.percent, 10);
      assert.equal(summary.json.personalFlex.meShare, 0);
      assert.equal(summary.json.personalFlex.spouseShare, 0);
      assert.equal(summary.json.variable.groceries.method, "override");
      assert.equal(summary.json.variable.groceries.target, 120);
      assert.equal(summary.json.variable.fuel.target, 75);
      assert.equal(summary.json.variable.groceries.lookbackWeeks, 6);
      assert.equal(summary.json.debtPlan.recommendationIsReadOnly, true);

      const invalid = await request(server, "POST", "/api/bill-schedule", { name: "Bad", amount: "NaN", dueDay: 1 });
      assert.equal(invalid.status, 400);
      assert.equal(invalid.json.message, "Invalid recurring obligation");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("rejects unauthenticated baseline reads and returns aggregate-only data to the service", async () => {
    const previousSecret = process.env.NEXA_FINANCE_BASELINE_SERVICE_TOKEN;
    process.env.NEXA_FINANCE_BASELINE_SERVICE_TOKEN = "test-only-service-secret";
    const app = express();
    app.use(express.json());
    const server = createServer(app);
    const fakeStore: any = {
      markBillsPoolAsExcluded: async () => undefined,
      getPlaidConnections: async () => [],
      getDebtsWithPayments: async () => [{ remainingBalance: 120 }],
    };
    await registerRoutes(server, app, fakeStore);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    try {
      const unauthenticated = await request(server, "GET", "/api/nexa/finance-baseline");
      assert.equal(unauthenticated.status, 401);

      const authenticated = await request(
        server,
        "GET",
        "/api/nexa/finance-baseline",
        undefined,
        { authorization: "Bearer test-only-service-secret" },
      );
      assert.equal(authenticated.status, 200);
      assert.equal(authenticated.json.baselineStatus, "incomplete");
      assert.equal(authenticated.json.combinedDebtStatus, "needs_mapping");
      assert.deepEqual(authenticated.json.manualLedgerDebt, { total: 120, count: 1 });
      assert.equal(JSON.stringify(authenticated.json).match(/name|mask|accountId|institution|accessToken|transaction/i), null);
    } finally {
      if (previousSecret === undefined) delete process.env.NEXA_FINANCE_BASELINE_SERVICE_TOKEN;
      else process.env.NEXA_FINANCE_BASELINE_SERVICE_TOKEN = previousSecret;
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});

import assert from "node:assert/strict";
import express from "express";
import { createServer, request as httpRequest } from "node:http";
import { describe, it } from "node:test";
import { registerRoutes } from "../routes";

function request(server: ReturnType<typeof createServer>, method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; json: any }>((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === "string") return reject(new Error("server did not bind"));
    const req = httpRequest({ hostname: "127.0.0.1", port: address.port, path, method, headers: { "content-type": "application/json" } }, (res) => {
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
});

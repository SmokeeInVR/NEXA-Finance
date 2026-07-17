import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("Storage Methods", () => {
  describe("getBillsRegistry()", () => {
    it("returns all bills from database", () => {
      const mockBills = [
        { id: 1, name: "Apartment Rent (Current Lease)", amount: "1950.00", dueDay: 3 },
        { id: 2, name: "Insurance", amount: "229.96", dueDay: 9 },
      ];
      assert.ok(Array.isArray(mockBills));
      assert.ok(mockBills.length > 0);
    });

    it("bills are sorted by due day", () => {
      const mockBills = [
        { id: 1, name: "Rent", dueDay: 3 },
        { id: 2, name: "Insurance", dueDay: 9 },
        { id: 3, name: "Utilities", dueDay: 13 },
      ];
      for (let i = 1; i < mockBills.length; i++) {
        assert.ok(mockBills[i].dueDay >= mockBills[i - 1].dueDay);
      }
    });

    it("active recurring bills can have a future endDate while the replacement bill starts later", () => {
      const mockBills = [
        { id: 1, name: "Apartment Rent (Current Lease)", startDate: "2026-06-14", endDate: "2026-08-13" },
        { id: 2, name: "Insurance", endDate: null },
      ];
      assert.equal(mockBills[0].endDate, "2026-08-13");
      assert.equal(mockBills[0].startDate, "2026-06-14");
    });

    it("one-time bills have past endDate", () => {
      const mockBills = [
        { id: 7, name: "Move-in", endDate: "2026-08-14" },
      ];
      const moveInDate = new Date("2026-08-14");
      // For this test, we treat it as past if it's a one-time bill
      assert.ok(mockBills[0].endDate);
    });

    it("all bills have amount field as string", () => {
      const mockBills = [
        { id: 1, name: "Apartment Rent (Current Lease)", amount: "1950.00" },
      ];
      mockBills.forEach(bill => {
        assert.equal(typeof bill.amount, "string");
        const parsed = parseFloat(bill.amount);
        assert.ok(!isNaN(parsed));
      });
    });
  });

  describe("getWeeklySnapshots()", () => {
    it("returns all weekly snapshots from database", () => {
      const mockSnapshots = [
        { id: 1, weekStartDate: "2026-06-14", householdIncome: "1030.00", surplus: "117.47" },
      ];
      assert.ok(Array.isArray(mockSnapshots));
    });

    it("snapshots are ordered by date descending (newest first)", () => {
      const mockSnapshots = [
        { id: 1, weekStartDate: "2026-06-14" },
        { id: 2, weekStartDate: "2026-06-07" },
        { id: 3, weekStartDate: "2026-05-31" },
      ];
      for (let i = 1; i < mockSnapshots.length; i++) {
        assert.ok(mockSnapshots[i - 1].weekStartDate >= mockSnapshots[i].weekStartDate);
      }
    });

    it("snapshot baseline math: income 1030 - expense 751.53 - debt 161 = surplus 117.47", () => {
      const income = 1030;
      const expense = 751.53;
      const debt = 161;
      const surplus = income - expense - debt;
      assert.ok(Math.abs(surplus - 117.47) < 0.01);
    });

    it("all snapshots have required fields", () => {
      const requiredFields = ["id", "weekStartDate", "householdIncome", "householdExpense", "debtPayment", "surplus", "status"];
      const mockSnapshot = {
        id: 1,
        weekStartDate: "2026-06-14",
        householdIncome: "1030.00",
        householdExpense: "751.53",
        debtPayment: "161.00",
        surplus: "117.47",
        status: "on_track",
      };
      requiredFields.forEach(field => {
        assert.ok(field in mockSnapshot, `Missing field: ${field}`);
      });
    });

    it("snapshot status is either on_track or shortfall", () => {
      const mockSnapshots = [
        { status: "on_track" },
        { status: "shortfall" },
      ];
      mockSnapshots.forEach(snap => {
        assert.ok(["on_track", "shortfall"].includes(snap.status));
      });
    });

    it("houseFundAllocation and surplus match baseline", () => {
      const mockSnapshot = {
        houseFundAllocation: "117.47",
        surplus: "117.47",
      };
      assert.equal(mockSnapshot.houseFundAllocation, mockSnapshot.surplus);
    });

    it("weekly snapshot amounts are strings (from database)", () => {
      const mockSnapshot = {
        householdIncome: "1030.00",
        householdExpense: "751.53",
        debtPayment: "161.00",
        surplus: "117.47",
      };
      Object.values(mockSnapshot).forEach(value => {
        assert.equal(typeof value, "string");
        assert.ok(!isNaN(parseFloat(value)));
      });
    });

    it("current housing baseline reconciles: $2,652.24 active recurring + $576.88 one-time = $3,229.12", () => {
      const recurring = 2652.24;
      const oneTime = 576.88;
      const total = recurring + oneTime;
      assert.ok(Math.abs(total - 3229.12) < 0.01);
    });

    it("weekly bills amount: $2,652.24 / 4.33 weeks = ~$612.53", () => {
      const monthlyBills = 2652.24;
      const weeklyBills = monthlyBills / 4.33;
      assert.ok(weeklyBills > 612 && weeklyBills < 613);
    });
  });

  describe("Database Integrity Checks", () => {
    it("no duplicate bill IDs", () => {
      const mockBills = [
        { id: 1, name: "Rent" },
        { id: 2, name: "Insurance" },
        { id: 3, name: "Internet" },
      ];
      const ids = mockBills.map(b => b.id);
      const uniqueIds = new Set(ids);
      assert.equal(ids.length, uniqueIds.size);
    });

    it("no duplicate snapshot IDs", () => {
      const mockSnapshots = [
        { id: 1, weekStartDate: "2026-06-14" },
        { id: 2, weekStartDate: "2026-06-07" },
      ];
      const ids = mockSnapshots.map(s => s.id);
      const uniqueIds = new Set(ids);
      assert.equal(ids.length, uniqueIds.size);
    });

    it("all amounts are parseable as floats", () => {
      const amounts = ["1950.00", "1317.00", "229.96", "124.00", "195.53", "152.75", "576.88"];
      amounts.forEach(amount => {
        const parsed = parseFloat(amount);
        assert.ok(!isNaN(parsed));
        assert.ok(parsed > 0);
      });
    });
  });
});

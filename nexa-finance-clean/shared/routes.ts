import { z } from "zod";
import { 
  insertBudgetSettingsSchema, 
  insertDebtSchema, 
  insertBusinessExpenseSchema, 
  insertMileageEntrySchema,
  insertWeeklyIncomeLogSchema,
  insertAccountBalanceSchema,
  insertSpendingLogSchema,
  insertBusinessIncomeLogSchema,
  insertBusinessSettingsSchema,
  insertBillsFundingLogSchema,
  insertAccountSchema,
  insertTransactionSchema,
  insertInvestmentSettingsSchema,
  insertTransferSchema,
  insertWeeklyCashSnapshotSchema
} from "./schema";

export const api = {
  // === ACCOUNTS (LEDGER SYSTEM) ===
  accounts: {
    list: {
      path: "/api/accounts",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    listWithBalances: {
      path: "/api/accounts/with-balances",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    create: {
      path: "/api/accounts",
      method: "POST",
      input: insertAccountSchema,
      responses: {
        201: z.any()
      }
    },
    update: {
      path: "/api/accounts/:id",
      method: "PATCH",
      input: insertAccountSchema.partial(),
      responses: {
        200: z.any()
      }
    },
    delete: {
      path: "/api/accounts/:id",
      method: "DELETE",
      responses: {
        204: z.any()
      }
    },
    seed: {
      path: "/api/accounts/seed",
      method: "POST",
      responses: {
        200: z.array(z.any())
      }
    }
  },
  // === TRANSACTIONS (CORE LEDGER) ===
  transactions: {
    list: {
      path: "/api/transactions",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    create: {
      path: "/api/transactions",
      method: "POST",
      input: insertTransactionSchema,
      responses: {
        201: z.any()
      }
    },
    delete: {
      path: "/api/transactions/:id",
      method: "DELETE",
      responses: {
        204: z.any()
      }
    }
  },
  budget: {
    get: {
      path: "/api/budget",
      method: "GET",
      responses: {
        200: z.any()
      }
    },
    update: {
      path: "/api/budget",
      method: "POST",
      input: insertBudgetSettingsSchema,
      responses: {
        200: z.any()
      }
    }
  },
  spending: {
    list: {
      path: "/api/spending",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    create: {
      path: "/api/spending",
      method: "POST",
      input: insertSpendingLogSchema,
      responses: {
        201: z.any()
      }
    },
    delete: {
      path: "/api/spending/:id",
      method: "DELETE",
      responses: {
        204: z.any()
      }
    }
  },
  debts: {
    list: {
      path: "/api/debts",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    create: {
      path: "/api/debts",
      method: "POST",
      input: insertDebtSchema,
      responses: {
        201: z.any()
      }
    },
    update: {
      path: "/api/debts/:id",
      method: "PATCH",
      input: z.object({ balance: z.string() }),
      responses: {
        200: z.any()
      }
    },
    delete: {
      path: "/api/debts/:id",
      method: "DELETE",
      responses: {
        204: z.any()
      }
    }
  },
  business: {
    expenses: {
      list: {
        path: "/api/business/expenses",
        method: "GET",
        responses: {
          200: z.array(z.any())
        }
      },
      create: {
        path: "/api/business/expenses",
        method: "POST",
        input: insertBusinessExpenseSchema,
        responses: {
          201: z.any()
        }
      },
      delete: {
        path: "/api/business/expenses/:id",
        method: "DELETE",
        responses: {
          204: z.any()
        }
      }
    },
    mileage: {
      list: {
        path: "/api/business/mileage",
        method: "GET",
        responses: {
          200: z.array(z.any())
        }
      },
      create: {
        path: "/api/business/mileage",
        method: "POST",
        input: insertMileageEntrySchema,
        responses: {
          201: z.any()
        }
      },
      delete: {
        path: "/api/business/mileage/:id",
        method: "DELETE",
        responses: {
          204: z.any()
        }
      }
    },
    income: {
      list: {
        path: "/api/business/income",
        method: "GET",
        responses: {
          200: z.array(z.any())
        }
      },
      create: {
        path: "/api/business/income",
        method: "POST",
        input: insertBusinessIncomeLogSchema,
        responses: {
          201: z.any()
        }
      },
      delete: {
        path: "/api/business/income/:id",
        method: "DELETE",
        responses: {
          204: z.any()
        }
      }
    },
    settings: {
      get: {
        path: "/api/business/settings",
        method: "GET",
        responses: {
          200: z.any()
        }
      },
      update: {
        path: "/api/business/settings",
        method: "POST",
        input: insertBusinessSettingsSchema,
        responses: {
          200: z.any()
        }
      }
    }
  },
  income: {
    list: {
      path: "/api/income",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    create: {
      path: "/api/income",
      method: "POST",
      input: insertWeeklyIncomeLogSchema,
      responses: {
        201: z.any()
      }
    },
    delete: {
      path: "/api/income/:id",
      method: "DELETE",
      responses: {
        204: z.any()
      }
    }
  },
  balances: {
    list: {
      path: "/api/balances",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    update: {
      path: "/api/balances",
      method: "POST",
      input: z.array(insertAccountBalanceSchema),
      responses: {
        200: z.array(z.any())
      }
    }
  },
  exports: {
    csv: {
      path: "/api/exports/:type",
      method: "GET"
    }
  },
  billsFunding: {
    list: {
      path: "/api/bills-funding",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    upsert: {
      path: "/api/bills-funding",
      method: "POST",
      input: insertBillsFundingLogSchema,
      responses: {
        200: z.any()
      }
    },
    delete: {
      path: "/api/bills-funding/:weekStartDate",
      method: "DELETE",
      responses: {
        200: z.object({ success: z.boolean() })
      }
    }
  },
  investment: {
    get: {
      path: "/api/investment",
      method: "GET",
      responses: {
        200: z.any()
      }
    },
    update: {
      path: "/api/investment",
      method: "POST",
      input: insertInvestmentSettingsSchema,
      responses: {
        200: z.any()
      }
    }
  },
  // === TRANSFERS ===
  transfers: {
    list: {
      path: "/api/transfers",
      method: "GET",
      responses: {
        200: z.array(z.any())
      }
    },
    create: {
      path: "/api/transfers",
      method: "POST",
      input: insertTransferSchema,
      responses: {
        201: z.any()
      }
    }
  },
  // === CASH SNAPSHOTS ===
  cashSnapshots: {
    get: {
      path: "/api/cash-snapshots/:weekStartDate",
      method: "GET",
      responses: {
        200: z.any()
      }
    },
    upsert: {
      path: "/api/cash-snapshots",
      method: "POST",
      input: insertWeeklyCashSnapshotSchema,
      responses: {
        200: z.any()
      }
    },
    delete: {
      path: "/api/cash-snapshots/:weekStartDate",
      method: "DELETE",
      responses: {
        204: z.any()
      }
    },
    computeTotalCash: {
      path: "/api/total-cash",
      method: "GET",
      responses: {
        200: z.object({
          totalCash: z.number(),
          includeTrading: z.boolean()
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Re-export types for convenience
export type { InsertBusinessExpense, InsertMileageEntry, InsertBusinessIncomeLog, InsertBusinessSettings, InsertBillsFundingLog, InsertInvestmentSettings, InvestmentSettings } from "./schema";

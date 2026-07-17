import type { PlaidAccount, PlaidBalanceSummaryAccount } from "@/hooks/use-plaid";

export type PlaidRenderableAccount = PlaidAccount | PlaidBalanceSummaryAccount;

export function getPlaidDisplayName(account: PlaidRenderableAccount) {
  return account.displayName || account.customName || account.name;
}

export function getPlaidOwnerLabel(ownerTag?: string | null) {
  switch (ownerTag) {
    case "me":
      return "Mine";
    case "spouse":
      return "Wife";
    case "joint":
      return "Joint";
    case "business":
      return "Business";
    case "household":
      return "Household";
    default:
      return null;
  }
}

export function getPlaidAccountTypeLabel(account: PlaidRenderableAccount) {
  if (account.debtKind === "credit_card") return "Credit card";
  if (account.debtKind === "auto_loan") return "Auto loan";
  if (account.debtKind === "loan") return "Loan";
  if (account.subtype) return account.subtype.replace(/_/g, " ");
  return account.type;
}

export function isPlaidDebtAccount(account: PlaidRenderableAccount) {
  return account.classification === "debt" || account.type === "credit" || account.type === "loan";
}

export function isPlaidCashAccount(account: PlaidRenderableAccount) {
  return account.classification === "cash" || account.type === "depository";
}

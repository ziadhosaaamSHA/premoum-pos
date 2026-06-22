export type FinanceTab = "revenue" | "expenses" | "profit" | "shift";

export type ExpenseRow = {
  id: string;
  date: string;
  title: string;
  vendor: string;
  amount: number;
  notes: string | null;
  source: "manual" | "purchase";
  sourceId: string;
};

export type RevenueRow = {
  key: string;
  period: string;
  source: string;
  total: number;
};

export type ShiftRow = {
  key: string;
  shift: string;
  sales: number;
  orders: number;
  expense: number;
  net: number;
};

export type FinancePayload = {
  kpis: {
    revenue: number;
    expenses: number;
    profit: number;
    cogs: number;
  };
  revenueRows: RevenueRow[];
  expenses: ExpenseRow[];
  profitInsights: {
    totalProfit: number;
    margin: number;
    bestCategoryName: string;
    bestCategoryMargin: number;
    expenseRatio: number;
  };
  shiftRows: ShiftRow[];
};

export type ExpenseModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

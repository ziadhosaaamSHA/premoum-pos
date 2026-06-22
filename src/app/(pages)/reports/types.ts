export type ReportsTab = "daily" | "monthly" | "profit" | "shifts" | "purchases" | "waste";

export type ReportModal = {
  title: string;
  rows: { label: string; value: string }[];
} | null;

export type DailyRow = {
  day: string;
  count: number;
  total: number;
};

export type MonthlyRow = {
  month: string;
  total: number;
  growth: number;
};

export type ProfitRow = {
  id: string;
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
};

export type ShiftRow = {
  date: string;
  shift: string;
  sales: number;
  profit: number;
};

export type PurchaseRow = {
  id: string;
  code: string;
  date: string;
  supplierId: string;
  supplier: string;
  materialId: string | null;
  material: string;
  quantity: number;
  unitCost: number;
  total: number;
  status: "posted" | "draft" | "cancelled";
  notes: string | null;
};

export type WasteRow = {
  id: string;
  date: string;
  materialId: string;
  material: string;
  unit: string;
  qty: number;
  reason: string;
  cost: number;
};

export type ReportsPayload = {
  insights: {
    todaySales: number;
    monthSales: number;
    wasteCost: number;
    purchasesTotal: number;
    inventoryValue: number;
  };
  dailyRows: DailyRow[];
  monthlyRows: MonthlyRow[];
  profitRows: ProfitRow[];
  shiftRows: ShiftRow[];
  purchases: PurchaseRow[];
  wasteRows: WasteRow[];
};

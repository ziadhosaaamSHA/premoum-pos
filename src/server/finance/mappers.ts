type ExpenseRow = {
  id: string;
  date: Date;
  title: string;
  vendor: string | null;
  amount: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function mapExpense(row: ExpenseRow) {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    title: row.title,
    vendor: row.vendor || "—",
    amount: Number(row.amount),
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function parseUiDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

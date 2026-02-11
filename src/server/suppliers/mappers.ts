type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  purchases: Array<{ id: string }>;
  createdAt: Date;
  updatedAt: Date;
};

export function mapSupplier(row: SupplierRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || "",
    email: row.email || "",
    status: row.isActive ? "active" : "inactive",
    purchasesCount: row.purchases.length,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type SupplierRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  purchasesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SupplierModalState = { mode: "view" | "edit" | "create"; id?: string } | null;

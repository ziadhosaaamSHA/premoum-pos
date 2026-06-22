"use client";

import { PageLoading } from "@/components/ui";
import SupplierModal from "./modals/SupplierModal";
import SuppliersTable from "./tables/SuppliersTable";
import { useSuppliersPage } from "../hooks/useSuppliersPage";

export default function SuppliersPageClient() {
  const suppliers = useSuppliersPage();

  return (
    <section className="page active">
      {suppliers.loading ? (
        <PageLoading message="جارٍ تحميل الموردين..." />
      ) : (
        <SuppliersTable {...suppliers} />
      )}
      <SupplierModal {...suppliers} />
    </section>
  );
}

import { Card, SearchInput, TableDataActions } from "@/components/ui";
import { OrdersPageState } from "../../hooks/useOrdersPage";

type TablesPanelProps = Pick<
  OrdersPageState,
  "filteredTables" | "openTableModal" | "setSelectedTableId" | "setTableSearch" | "tableSearch"
>;

export default function TablesPanel({
  filteredTables,
  openTableModal,
  setSelectedTableId,
  setTableSearch,
  tableSearch,
}: TablesPanelProps) {
  return (
    <div className="subtab-panel active">
      <Card>
        <div className="section-header-actions">
          <h2>خريطة الطاولات</h2>
          <div className="table-toolbar">
            <SearchInput value={tableSearch} onChange={setTableSearch} placeholder="بحث في الطاولات..." />
            <button className="primary" type="button" onClick={() => openTableModal()}>
              <i className="bx bx-plus"></i>
              إضافة طاولة
            </button>
            <TableDataActions
              rows={filteredTables}
              columns={[
                { label: "الطاولة", value: (row) => row.name },
                { label: "الرقم", value: (row) => row.number },
                { label: "الحالة", value: (row) => (row.status === "occupied" ? "مشغولة" : "فارغة") },
              ]}
              fileName="orders-tables"
              printTitle="الطاولات"
            />
          </div>
        </div>
        <div className="table-grid">
          {filteredTables.map((table) => (
            <button
              key={table.id}
              type="button"
              className={`table-card ${table.status === "occupied" ? "occupied" : "empty"}`}
              onClick={() => setSelectedTableId(table.id)}
            >
              <i className="bx bx-table"></i>
              <strong>{table.name}</strong>
              <span>{table.status === "occupied" ? "مشغولة" : "فارغة"}</span>
            </button>
          ))}
        </div>
        {filteredTables.length === 0 ? <p className="hint">لا توجد طاولات مطابقة لبحثك.</p> : null}
      </Card>
    </div>
  );
}

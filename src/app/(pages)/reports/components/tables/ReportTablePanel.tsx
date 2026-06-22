import { DataTable, DataTableColumn, getExportColumns, TableSection } from "@/components/ui";

type ReportTablePanelProps<T> = {
  title: string;
  tableId: string;
  fileName: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T, index: number) => string;
  search: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  };
  filters?: Array<{
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }>;
  loading?: boolean;
};

export default function ReportTablePanel<T>({
  title,
  tableId,
  fileName,
  rows,
  columns,
  getRowKey,
  search,
  filters,
  loading = false,
}: ReportTablePanelProps<T>) {
  return (
    <TableSection
      title={title}
      search={search}
      filters={filters}
      exportActions={{
        rows,
        columns: getExportColumns(columns),
        fileName,
        printTitle: title,
        tableId,
      }}
    >
      {loading ? (
        <p className="hint">جارٍ تحميل البيانات...</p>
      ) : (
        <DataTable id={tableId} rows={rows} columns={columns} getRowKey={getRowKey} />
      )}
    </TableSection>
  );
}

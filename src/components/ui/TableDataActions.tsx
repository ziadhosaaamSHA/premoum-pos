"use client";

type TableDataColumn<T> = {
  label: string;
  value: (row: T) => string | number | null | undefined;
};

type TableDataActionsProps<T> = {
  rows: T[];
  columns: TableDataColumn<T>[];
  fileName: string;
  printTitle: string;
  tableId?: string;
};

function toCsvSafe(value: string) {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export default function TableDataActions<T>({
  rows,
  columns,
  fileName,
  printTitle,
  tableId,
}: TableDataActionsProps<T>) {
  const handleExportCsv = () => {
    const header = columns.map((column) => toCsvSafe(column.label)).join(",");
    const lines = rows.map((row) =>
      columns
        .map((column) => {
          const raw = column.value(row);
          const value = raw === null || raw === undefined ? "" : String(raw);
          return toCsvSafe(value);
        })
        .join(",")
    );

    const csvContent = [header, ...lines].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    let html = "";

    if (tableId) {
      const table = document.getElementById(tableId);
      if (table) {
        const cloned = table.cloneNode(true) as HTMLElement;
        const headerRow = cloned.querySelector("thead tr");
        const headerCells = headerRow ? Array.from(headerRow.children) : [];
        const actionIndex = headerCells.findIndex((cell) =>
          cell.textContent?.trim().includes("الإجراءات")
        );
        if (actionIndex >= 0) {
          const rows = cloned.querySelectorAll("tr");
          rows.forEach((row) => {
            const cells = Array.from(row.children);
            if (cells[actionIndex]) {
              cells[actionIndex].remove();
            }
          });
        }
        html = cloned.outerHTML;
      }
    }

    if (!html) {
      const header = `<tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr>`;
      const body = rows
        .map(
          (row) =>
            `<tr>${columns
              .map((column) => `<td>${String(column.value(row) ?? "")}</td>`)
              .join("")}</tr>`
        )
        .join("");
      html = `<table>${header}${body}</table>`;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${printTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; color: #1f2937; }
            h1 { font-size: 20px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: right; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${printTitle}</h1>
          ${html}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="table-actions-export">
      <button className="ghost" type="button" onClick={handleExportCsv} title="تصدير CSV">
        <i className="bx bx-export"></i>
        تصدير CSV
      </button>
      <button className="ghost" type="button" onClick={handlePrint} title="طباعة">
        <i className="bx bx-printer"></i>
        طباعة
      </button>
    </div>
  );
}

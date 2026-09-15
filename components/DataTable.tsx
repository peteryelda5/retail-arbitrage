export interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

export default function DataTable({
  columns,
  rows,
  emptyMessage = "No records yet.",
}: {
  columns: Column[];
  rows: any[];
  emptyMessage?: string;
}) {
  if (!rows || rows.length === 0) {
    return <div className="card text-sm text-muted">{emptyMessage}</div>;
  }

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => (
              <th key={c.key} className="px-4 py-3 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-border last:border-0 hover:bg-surface2/50">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-gray-200">
                  {c.render ? c.render(row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

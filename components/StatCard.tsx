export default function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-muted mb-2">{label}</div>
      <div className="text-2xl font-semibold text-gray-100">{value}</div>
      {sublabel && <div className="text-xs text-muted mt-1">{sublabel}</div>}
    </div>
  );
}

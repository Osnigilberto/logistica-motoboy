export default function DashboardCard({ icon, title, value }) {
  return (
    <div style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: 8, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontWeight: '700', fontSize: '1.2rem' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{value}</div>
    </div>
  );
}

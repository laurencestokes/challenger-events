import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requireAdmin>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Admin pages don't need header/footer - clean interface */}
        {children}
      </div>
    </ProtectedRoute>
  );
}

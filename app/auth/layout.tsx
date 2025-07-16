import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-secondary-50 dark:bg-secondary-900">
        {children}
      </main>
      <Footer />
    </div>
  );
}

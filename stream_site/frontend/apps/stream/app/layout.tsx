import './globals.css';
import ServiceWorkerRegister from '@/components/system/ServiceWorkerRegister';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white font-sans antialiased min-h-screen">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

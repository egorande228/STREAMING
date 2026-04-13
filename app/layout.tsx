import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getDb } from "@/lib/store";

export async function generateMetadata(): Promise<Metadata> {
  const db = await getDb();
  return {
    title: `${db.siteConfig.siteName} | Match operations platform`,
    description: db.siteConfig.siteTagline
  };
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const db = await getDb();
  const announcement = db.announcements.find((item) => item.active);

  return (
    <html lang="en">
      <body>
        {announcement ? (
          <div className="announcement">
            <span>{announcement.title}</span>
            <p>{announcement.body}</p>
            <a href={announcement.ctaHref}>{announcement.ctaLabel}</a>
          </div>
        ) : null}
        <header className="site-header">
          <div>
            <Link className="brand" href="/">
              {db.siteConfig.siteName}
            </Link>
            <p className="tagline">{db.siteConfig.siteTagline}</p>
          </div>
          <nav className="nav">
            <Link href="/">Matches</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div>
            <strong>Primary</strong> {db.siteConfig.primaryDomain}
          </div>
          <div>
            <strong>Backup</strong> {db.siteConfig.backupDomain}
          </div>
          <div>
            <strong>Ops</strong> {db.siteConfig.supportEmail}
          </div>
        </footer>
      </body>
    </html>
  );
}

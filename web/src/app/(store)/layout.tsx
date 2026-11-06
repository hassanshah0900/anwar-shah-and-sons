import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { siteConfig } from '@/config/site';

export default function StoreLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      {siteConfig.announcement && (
        <p className="bg-primary px-4 py-2 text-center text-xs tracking-wide text-primary-foreground">
          {siteConfig.announcement}
        </p>
      )}
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

export default function StoreLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage, ContentSection } from '@/components/layout/content-page';
import { contentConfig } from '@/config/content';

export const metadata: Metadata = {
  title: 'Returns & exchanges',
  description: 'How to return or exchange an item from Anwar Shah & Sons.',
};

export default function ReturnsPage() {
  const { returns, contact } = contentConfig;

  return (
    <ContentPage
      title="Returns & exchanges"
      intro={`Changed your mind or need another size? You have ${returns.windowDays} days from delivery.`}
    >
      <ContentSection title="What can be returned">
        <p>
          Items that are unworn, unwashed and have their tags attached can be returned or exchanged
          within {returns.windowDays} days of delivery.
        </p>
      </ContentSection>
      <ContentSection title="How to start">
        <p>
          <Link href="/contact" className="text-foreground underline underline-offset-4">
            Contact us
          </Link>{' '}
          at{' '}
          <a
            href={`mailto:${contact.email}`}
            className="text-foreground underline underline-offset-4"
          >
            {contact.email}
          </a>{' '}
          with your order number and the items you&apos;d like to return or exchange. We&apos;ll
          arrange the next steps with you.
        </p>
      </ContentSection>
      <ContentSection title="Refunds">
        <p>
          Once we receive the item and check it, we refund the amount you paid for it. Exchanges are
          sent as soon as the new size or colour is available.
        </p>
      </ContentSection>
    </ContentPage>
  );
}

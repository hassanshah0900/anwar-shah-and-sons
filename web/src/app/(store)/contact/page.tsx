import type { Metadata } from 'next';
import { ContentPage, ContentSection } from '@/components/layout/content-page';
import { contentConfig } from '@/config/content';

export const metadata: Metadata = {
  title: 'Contact us',
  description: 'How to reach Anwar Shah & Sons about an order or a question.',
};

export default function ContactPage() {
  const { contact } = contentConfig;
  const tel = contact.phone.replace(/[^+\d]/g, '');

  return (
    <ContentPage
      title="Contact us"
      intro="Questions about an order, a size or a fabric? We're happy to help."
    >
      <ContentSection title="Email">
        <p>
          <a
            href={`mailto:${contact.email}`}
            className="text-foreground underline underline-offset-4"
          >
            {contact.email}
          </a>
          . Include your order number if it&apos;s about an order.
        </p>
      </ContentSection>
      <ContentSection title="Phone">
        <p>
          <a href={`tel:${tel}`} className="text-foreground underline underline-offset-4">
            {contact.phone}
          </a>
          , {contact.hours}.
        </p>
      </ContentSection>
      <ContentSection title="Visit the shop">
        <address className="not-italic">
          {contact.address.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
        <p>{contact.hours}.</p>
      </ContentSection>
    </ContentPage>
  );
}

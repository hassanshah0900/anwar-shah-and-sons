import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/layout/content-page';
import { Button } from '@/components/ui/button';
import { contentConfig } from '@/config/content';

export const metadata: Metadata = {
  title: 'About us',
  description: 'The story of Anwar Shah & Sons.',
};

export default function AboutPage() {
  return (
    <ContentPage title="About us">
      <div className="flex flex-col gap-5 text-lg leading-8 text-muted-foreground">
        {contentConfig.about.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div>
        <Button asChild size="lg">
          <Link href="/shop">Shop the collection</Link>
        </Button>
      </div>
    </ContentPage>
  );
}

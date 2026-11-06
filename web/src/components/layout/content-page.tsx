import type { ReactNode } from 'react';

/** A readable single-column page for help and company content. */
export function ContentPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="page-container py-16">
      <div className="max-w-2xl">
        <h1 className="text-5xl">{title}</h1>
        {intro && <p className="mt-4 text-lg leading-8 text-muted-foreground">{intro}</p>}
        <div className="mt-12 flex flex-col gap-10">{children}</div>
      </div>
    </main>
  );
}

export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t pt-8">
      <h2 className="font-sans text-lg font-medium tracking-normal">{title}</h2>
      <div className="flex flex-col gap-3 leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

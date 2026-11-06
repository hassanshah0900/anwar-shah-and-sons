import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';

/** A large photo link with a short headline, for an edit or collection. */
export function PhotoFeature({
  eyebrow,
  title,
  href,
  cta,
  image,
}: {
  eyebrow: string;
  title: string;
  href: string;
  cta: string;
  image: { src: string; alt: string };
}) {
  return (
    <Link
      href={href}
      className="group relative flex aspect-4/5 items-end overflow-hidden rounded-md bg-muted sm:aspect-square"
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {/* A solid panel keeps the text readable on any photo. */}
      <div className="relative m-4 flex max-w-sm flex-col gap-3 rounded-sm bg-background p-6">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h2 className="text-3xl">{title}</h2>
        <span className="flex items-center gap-1 text-sm">
          {cta}
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

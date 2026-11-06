import type { Metadata } from 'next';
import { ArrowRightIcon, HeartIcon, ShoppingBagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ToastDemo } from './toast-demo';

export const metadata: Metadata = {
  title: 'Style guide',
  robots: { index: false, follow: false },
};

// Full class names so Tailwind can detect them.
const colours = [
  { name: 'background', className: 'bg-background' },
  { name: 'foreground', className: 'bg-foreground' },
  { name: 'primary', className: 'bg-primary' },
  { name: 'secondary', className: 'bg-secondary' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'muted-foreground', className: 'bg-muted-foreground' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'border', className: 'bg-border' },
  { name: 'input', className: 'bg-input' },
  { name: 'destructive', className: 'bg-destructive' },
  { name: 'success', className: 'bg-success' },
];

const radii = [
  { name: 'xs', className: 'rounded-xs' },
  { name: 'sm', className: 'rounded-sm' },
  { name: 'md', className: 'rounded-md' },
  { name: 'lg', className: 'rounded-lg' },
];

const buttonVariants = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const;
const buttonSizes = ['xs', 'sm', 'default', 'lg'] as const;
const sizes = ['XS', 'S', 'M', 'L', 'XL'];

export default function StyleguidePage() {
  return (
    <main className="page-container py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Design system
        </p>
        <h1 className="mt-3 text-5xl sm:text-6xl">Style guide</h1>
        <p className="mt-4 text-muted-foreground">
          Monochrome tokens, a small radius and borders over shadows. Toggle the theme in the header
          to check both modes.
        </p>
      </header>

      <Section title="Colour">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {colours.map((colour) => (
            <div key={colour.name}>
              <div className={`${colour.className} h-16 rounded-md border`} />
              <p className="mt-2 font-mono text-xs text-muted-foreground">{colour.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-6">
          <Specimen label="Display · Instrument Serif">
            <h2 className="text-6xl">The Summer Edit</h2>
          </Specimen>
          <Specimen label="Display italic">
            <h2 className="text-4xl italic">Tailored, unhurried</h2>
          </Specimen>
          <Specimen label="Heading · Geist medium">
            <h3 className="text-xl">Product details</h3>
          </Specimen>
          <Specimen label="Body · Geist">
            <p className="max-w-prose">
              A relaxed shirt cut from breathable cotton lawn, finished with mother-of-pearl buttons
              and a curved hem.
            </p>
          </Specimen>
          <Specimen label="Eyebrow">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              New season
            </p>
          </Specimen>
          <Specimen label="Price · tabular figures">
            <p className="flex items-baseline gap-3 tabular-nums">
              <span className="text-lg font-medium">Rs 4,990</span>
              <span className="text-sm text-muted-foreground line-through">Rs 6,490</span>
            </p>
          </Specimen>
          <Specimen label="Mono · SKU">
            <p className="font-mono text-sm">ASS-SHRT-0142-M-WHT</p>
          </Specimen>
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap gap-6">
          {radii.map((radius) => (
            <div key={radius.name} className="text-center">
              <div className={`${radius.className} size-20 border-2 border-foreground`} />
              <p className="mt-2 font-mono text-xs text-muted-foreground">{radius.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            {buttonVariants.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {buttonSizes.map((size) => (
              <Button key={size} size={size}>
                Size {size}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">
              <ShoppingBagIcon data-icon="inline-start" />
              Add to bag
            </Button>
            <Button variant="outline" size="icon-lg" aria-label="Add to wishlist">
              <HeartIcon />
            </Button>
            <Button variant="link">
              Shop the collection
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button disabled>Sold out</Button>
          </div>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sg-email">Email</Label>
            <Input id="sg-email" type="email" placeholder="you@example.com" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-invalid">Postcode</Label>
            <Input id="sg-invalid" defaultValue="ABC" aria-invalid />
            <p className="text-sm text-destructive">Enter a valid postcode.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-sort">Sort by</Label>
            <Select defaultValue="newest">
              <SelectTrigger id="sg-sort" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price-asc">Price: low to high</SelectItem>
                <SelectItem value="price-desc">Price: high to low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-disabled">Disabled</Label>
            <Input id="sg-disabled" disabled placeholder="Not editable" />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="sg-notes">Order notes</Label>
            <Textarea id="sg-notes" placeholder="Anything we should know?" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="sg-newsletter" defaultChecked />
            <Label htmlFor="sg-newsletter">Email me about new arrivals</Label>
          </div>
          <RadioGroup defaultValue="standard" className="gap-3">
            <div className="flex items-center gap-2">
              <RadioGroupItem id="sg-standard" value="standard" />
              <Label htmlFor="sg-standard">Standard delivery</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem id="sg-express" value="express" />
              <Label htmlFor="sg-express">Express delivery</Label>
            </div>
          </RadioGroup>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-3">
          <Badge>New</Badge>
          <Badge variant="secondary">Bestseller</Badge>
          <Badge variant="outline">Limited</Badge>
          <Badge variant="destructive">Sold out</Badge>
        </div>
      </Section>

      <Section title="Overlays">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove item?</DialogTitle>
                <DialogDescription>
                  The linen shirt in size M will be removed from your bag.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button variant="destructive">Remove</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Your bag</SheetTitle>
                <SheetDescription>Your bag is empty.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Dropdown</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Orders</DropdownMenuItem>
              <DropdownMenuItem>Addresses</DropdownMenuItem>
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Free delivery over Rs 5,000</TooltipContent>
          </Tooltip>
        </div>
        <div className="mt-6">
          <ToastDemo />
        </div>
      </Section>

      <Section title="Loading">
        <div className="grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="aspect-3/4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Sizes (pattern)">
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <Button key={size} variant={size === 'M' ? 'default' : 'outline'} className="w-12">
              {size}
            </Button>
          ))}
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="text-3xl">{title}</h2>
      <Separator className="mt-4 mb-8" />
      {children}
    </section>
  );
}

function Specimen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-baseline sm:gap-8">
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MAX_ADDRESSES, type Address } from '@repo/shared';
import { ConfirmDeleteDialog } from '@/components/admin/confirm-delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAddresses } from '@/lib/api/addresses';
import { requireUser } from '@/lib/auth/session';
import { makeDefaultAddress, removeAddress } from './actions';
import { AddressDialog } from './address-dialog';
import { MakeDefaultButton } from './make-default-button';
import { PageBreadcrumbs } from '@/components/layout/page-breadcrumbs';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Your addresses', robots: { index: false } };

export default function AddressesPage() {
  return (
    <main className="page-container py-16">
      <PageBreadcrumbs crumbs={[{ name: 'Your account', href: '/account' }]} />
      <h1 className="mt-3 text-5xl">Your addresses</h1>
      <p className="mt-3 text-muted-foreground">Your default address fills in checkout.</p>
      <Suspense fallback={<Skeleton className="mt-10 h-48 w-full" />}>
        <Addresses />
      </Suspense>
    </main>
  );
}

async function Addresses() {
  await requireUser('/account/addresses');
  const addresses = await getAddresses();
  const full = addresses.length >= MAX_ADDRESSES;

  return (
    <div className="mt-10 flex flex-col gap-6">
      <div>
        {full ? (
          <p className="text-sm text-muted-foreground">
            You can save up to {MAX_ADDRESSES} addresses. Delete one to add another.
          </p>
        ) : (
          <AddressDialog trigger={<Button>Add an address</Button>} />
        )}
      </div>

      {addresses.length === 0 ? (
        <p className="border border-dashed p-10 text-center text-sm text-muted-foreground">
          No saved addresses yet. You can also save one when you check out.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.map((address) => (
            <li key={address.id}>
              <AddressCard address={address} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddressCard({ address }: { address: Address }) {
  return (
    <Card role="article" className="h-full gap-4 p-5 text-base">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-sans text-sm font-medium tracking-normal">{address.fullName}</h2>
        {address.isDefault && <Badge>Default</Badge>}
      </div>
      <address className="flex flex-col text-sm text-muted-foreground not-italic">
        <span>{address.line1}</span>
        {address.line2 && <span>{address.line2}</span>}
        <span>{[address.city, address.postalCode].filter(Boolean).join(' ')}</span>
        <span>{address.phone}</span>
      </address>
      <div className="mt-auto flex flex-wrap gap-2">
        <AddressDialog
          address={address}
          trigger={
            <Button variant="outline" size="sm" aria-label={`Edit ${address.line1}`}>
              Edit
            </Button>
          }
        />
        {!address.isDefault && <MakeDefaultButton id={address.id} action={makeDefaultAddress} />}
        <ConfirmDeleteDialog
          title="Delete this address?"
          description={`${address.line1}, ${address.city} will be removed from your address book.`}
          action={removeAddress}
          fields={{ id: address.id }}
          label={`Delete ${address.line1}`}
          trigger={
            <Button variant="ghost" size="sm">
              Delete
            </Button>
          }
        />
      </div>
    </Card>
  );
}

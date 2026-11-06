import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DEFAULT_PAGE_SIZE, userListQuerySchema, type UserListQuery } from '@repo/shared';
import { ListFooter } from '@/components/lists/list-footer';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getUsers } from '@/lib/api/users';
import { requireAdmin } from '@/lib/auth/session';

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });

export const metadata: Metadata = { title: 'Customers' };

export default function CustomersPage({ searchParams }: PageProps<'/admin/customers'>) {
  return (
    <main className="page-container py-12">
      <h1 className="text-4xl">Customers</h1>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTable searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function UsersTable({ searchParams }: Pick<PageProps<'/admin/customers'>, 'searchParams'>) {
  await requireAdmin('/admin/customers');
  const raw = await searchParams;
  const parsed = userListQuerySchema.safeParse({ page: raw.page, pageSize: raw.pageSize });
  const query: UserListQuery = parsed.success
    ? parsed.data
    : { page: 1, pageSize: DEFAULT_PAGE_SIZE };
  const { users, total } = await getUsers(query);
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(query.pageSize));
    return `/admin/customers${params.size ? `?${params}` : ''}`;
  };

  return (
    <section className="mt-8">
      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'outline'}
                    className="capitalize"
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dateFormat.format(new Date(user.createdAt))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ListFooter
        summary={`${total} ${total === 1 ? 'account' : 'accounts'}`}
        total={total}
        page={query.page}
        pageSize={query.pageSize}
        href={href}
      />
    </section>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="mt-8 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

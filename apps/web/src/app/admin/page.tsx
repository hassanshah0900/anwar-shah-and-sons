import { Suspense } from 'react';
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

export default function AdminPage() {
  return (
    <main className="page-container py-12">
      <h1 className="text-4xl">Customers</h1>
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTable />
      </Suspense>
    </main>
  );
}

async function UsersTable() {
  await requireAdmin('/admin');
  const { users, total } = await getUsers();

  return (
    <section className="mt-8">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? 'account' : 'accounts'}
      </p>
      <div className="mt-4 border">
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

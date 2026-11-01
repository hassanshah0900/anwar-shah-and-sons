'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast('Added to your bag')}>
        Default toast
      </Button>
      <Button variant="outline" onClick={() => toast.success('Order placed')}>
        Success toast
      </Button>
      <Button variant="outline" onClick={() => toast.error('Payment declined')}>
        Error toast
      </Button>
    </div>
  );
}

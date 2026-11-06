import Link from 'next/link';
import type { ProductDetail, StoreConfig } from '@repo/shared';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { contentConfig } from '@/config/content';
import { formatPrice } from '@/lib/money';

/** Details, sizing, delivery and returns under the add-to-bag button. */
export function ProductInfo({ product, store }: { product: ProductDetail; store: StoreConfig }) {
  const { shipping, returns, sizeGuide } = contentConfig;
  const sizeLabels = new Set(
    product.options
      .filter((option) => option.slug === 'size')
      .flatMap((option) => option.values.map((value) => value.label)),
  );
  const sizes = sizeGuide.filter((row) => sizeLabels.has(row.size));
  const { flatRate, freeOver } = store.shipping;

  return (
    <Accordion
      type="multiple"
      defaultValue={product.description ? ['details'] : []}
      className="border-t"
    >
      {product.description && (
        <AccordionItem value="details">
          <AccordionTrigger>Details</AccordionTrigger>
          <AccordionContent>
            <p className="leading-7 whitespace-pre-line">{product.description}</p>
          </AccordionContent>
        </AccordionItem>
      )}

      {sizes.length > 0 && (
        <AccordionItem value="sizes">
          <AccordionTrigger>Size guide</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3">
            <Table className="tabular-nums">
              <TableHeader>
                <TableRow>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Chest (in)</TableHead>
                  <TableHead className="text-right">Length (in)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizes.map((row) => (
                  <TableRow key={row.size}>
                    <TableCell>{row.size}</TableCell>
                    <TableCell className="text-right">{row.chest}</TableCell>
                    <TableCell className="text-right">{row.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-muted-foreground">
              Measured flat across the garment. Between sizes? Choose the larger one.
            </p>
          </AccordionContent>
        </AccordionItem>
      )}

      <AccordionItem value="delivery">
        <AccordionTrigger>Delivery</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 leading-7">
          <p>
            {shipping.areas} Orders arrive in {shipping.deliveryTime}.
          </p>
          <p>
            Delivery is {formatPrice(flatRate, store)} per order
            {freeOver !== null && `, free on orders of ${formatPrice(freeOver, store)} or more`}.
          </p>
          <Link href="/shipping" className="underline underline-offset-4">
            Shipping details
          </Link>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="returns">
        <AccordionTrigger>Returns & exchanges</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 leading-7">
          <p>Exchange or return unworn items within {returns.windowDays} days of delivery.</p>
          <Link href="/returns" className="underline underline-offset-4">
            How returns work
          </Link>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

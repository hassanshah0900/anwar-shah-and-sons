'use client';

import { useId, useRef, useState, useTransition } from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVerticalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** What a reorder Server Action returns: nothing, or why it failed. */
export type ReorderResult = { error?: string } | void;

type SortableListProps<T extends { id: string }> = {
  items: T[];
  /** Short name of an item, for its handle's label and screen reader announcements. */
  label: (item: T) => string;
  /** Saves the new order; the list shows it straight away and goes back if this fails. */
  onReorder: (ids: string[]) => Promise<ReorderResult>;
  /** Renders an item at `index` in the order shown; place `handle` where it's dragged from. */
  children: (item: T, handle: React.ReactNode, index: number) => React.ReactNode;
  layout?: 'list' | 'grid';
  className?: string;
  itemClassName?: string;
};

/**
 * A list reordered by dragging each item's handle, or from the keyboard: focus a
 * handle, press Space, move with the arrow keys and press Space again to drop.
 */
export function SortableList<T extends { id: string }>({
  items,
  label,
  onReorder,
  children,
  layout = 'list',
  className,
  itemClassName,
}: SortableListProps<T>) {
  const id = useId();
  const [order, setOrder] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const moved = useRef(false);
  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so clicks on the handle still work.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Show the order just chosen until the saved one arrives as new items.
  const itemsKey = items.map((item) => item.id).join();
  const [seenKey, setSeenKey] = useState(itemsKey);
  if (seenKey !== itemsKey) {
    setSeenKey(itemsKey);
    setOrder(null);
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const shown =
    order && order.length === items.length && order.every((itemId) => byId.has(itemId))
      ? order.map((itemId) => byId.get(itemId) as T)
      : items;

  const name = (itemId: UniqueIdentifier) => {
    const item = byId.get(String(itemId));
    return item ? label(item) : 'the item';
  };
  const place = (itemId: UniqueIdentifier) =>
    `position ${shown.findIndex((item) => item.id === itemId) + 1} of ${shown.length}`;
  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      moved.current = false;
      return `Picked up ${name(active.id)}, ${place(active.id)}.`;
    },
    // A drag starts over its own item; say nothing until it has gone somewhere.
    onDragOver: ({ active, over }) => {
      if (!over) return undefined;
      if (over.id === active.id) {
        return moved.current ? `${name(active.id)} moved back to ${place(over.id)}.` : undefined;
      }
      moved.current = true;
      return `${name(active.id)} moved to ${place(over.id)}.`;
    },
    onDragEnd: ({ active, over }) =>
      over ? `${name(active.id)} dropped at ${place(over.id)}.` : `${name(active.id)} dropped.`,
    onDragCancel: ({ active }) => `Moving ${name(active.id)} was cancelled.`,
  };

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = shown.map((item) => item.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOrder(next);
    setError(null);
    startTransition(async () => {
      const result = await onReorder(next);
      if (result?.error) {
        setOrder(null);
        setError(result.error);
      }
    });
  }

  return (
    <div className="grid gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DndContext
        id={id}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={
          layout === 'list'
            ? [restrictToVerticalAxis, restrictToParentElement]
            : [restrictToParentElement]
        }
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'To reorder, press Space, move with the arrow keys, then press Space again to drop it, or Escape to cancel.',
          },
        }}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={shown.map((item) => item.id)}
          strategy={layout === 'list' ? verticalListSortingStrategy : rectSortingStrategy}
        >
          <ul className={className}>
            {shown.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                label={label(item)}
                className={itemClassName}
                alone={shown.length < 2}
              >
                {(handle) => children(item, handle, index)}
              </SortableItem>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableItem({
  id,
  label,
  className,
  alone,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  /** The only item: nothing to reorder, so a blank keeps the layout instead of a handle. */
  alone: boolean;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const handle = alone ? (
    <span aria-hidden className="size-8 shrink-0" />
  ) : (
    <Button
      ref={setActivatorNodeRef}
      type="button"
      variant="ghost"
      size="icon-sm"
      className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      {...attributes}
      {...listeners}
      aria-label={`Reorder ${label}`}
    >
      <GripVerticalIcon />
    </Button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && 'relative z-10 bg-background shadow-md')}
    >
      {children(handle)}
    </li>
  );
}

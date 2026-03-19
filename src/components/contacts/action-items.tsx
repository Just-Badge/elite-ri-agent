"use client";

interface ActionItemsProps {
  items: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
  onToggle: (actionItemId: string, completed: boolean) => Promise<void>;
}

export function ActionItems({ items, onToggle }: ActionItemsProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No action items</p>
    );
  }

  // Show incomplete items first, completed items at bottom
  const sorted = [...items].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  return (
    <div className="space-y-2">
      {sorted.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-3 py-1 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={item.completed}
            onChange={() => onToggle(item.id, !item.completed)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span
            className={
              item.completed
                ? "line-through text-muted-foreground"
                : ""
            }
          >
            {item.text}
          </span>
        </label>
      ))}
    </div>
  );
}

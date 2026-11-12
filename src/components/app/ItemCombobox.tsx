import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDb, useCurrentUser } from "@/hooks/use-data";
import { itemQueries, itemService } from "@/services/entries";
import { can } from "@/services/core";
import { normalize } from "@/mock/seed";
import type { ExpenseType, Item } from "@/types";
import { ENTRY_TYPE_LABEL } from "@/lib/format";

export function ItemCombobox({
  type,
  value,
  onChange,
  invalid,
}: {
  type: ExpenseType;
  value?: string;
  onChange: (item: Item) => void;
  invalid?: boolean;
}) {
  const db = useDb();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const items = useMemo(() => itemQueries.byType(db, type), [db, type]);
  const selected = items.find((i) => i.id === value);
  const exact = query.trim() ? items.find((i) => i.normalized === normalize(query)) : undefined;
  const canAdd = can(user, "manageItems");

  const add = async () => {
    setAdding(true);
    try {
      const { item, existed } = await itemService.create(type, query);
      onChange(item);
      toast[existed ? "info" : "success"](
        existed
          ? `“${item.name}” already exists — selected it.`
          : `Added “${item.name}” to ${ENTRY_TYPE_LABEL[type]}`,
      );
      setOpen(false);
      setQuery("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Item"
          className={cn(
            "h-12 w-full justify-between text-base font-normal",
            !selected && "text-muted-foreground",
            invalid && "border-destructive",
          )}
        >
          <span className="truncate">
            {selected?.name ?? `Search ${ENTRY_TYPE_LABEL[type].toLowerCase()} items…`}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder="Type to search…"
            value={query}
            onValueChange={setQuery}
            className="h-11"
          />
          <CommandList className="max-h-64">
            <CommandEmpty className="px-3 py-4 text-sm text-muted-foreground">
              No matching item.
            </CommandEmpty>
            <CommandGroup heading={`${ENTRY_TYPE_LABEL[type]} items`}>
              {items.map((i) => (
                <CommandItem
                  key={i.id}
                  value={i.name}
                  onSelect={() => {
                    onChange(i);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="py-2.5"
                >
                  <Check className={cn("mr-1", value === i.id ? "opacity-100" : "opacity-0")} />
                  {i.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="border-t p-2">
            {canAdd ? (
              <Button
                type="button"
                variant="soft"
                className="w-full justify-start"
                disabled={!query.trim() || adding || !!exact}
                onClick={add}
              >
                {adding ? <Loader2 className="animate-spin" /> : <Plus />}
                {exact
                  ? `“${exact.name}” already exists`
                  : query.trim()
                    ? `Add new item “${query.trim().replace(/\s+/g, " ")}”`
                    : "Add new item — type a name above"}
              </Button>
            ) : (
              <p className="px-2 py-1 text-xs text-muted-foreground">
                You can't add new items. Ask the owner for permission.
              </p>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

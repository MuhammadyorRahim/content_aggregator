"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCE_TYPES } from "@/lib/constants";

export type FeedFilters = {
  query: string;
  category: string;
  sourceType: string;
};

type FilterBarProps = {
  value: FeedFilters;
  onChange: (next: FeedFilters) => void;
  categories?: string[];
};

export function FilterBar({ value, onChange, categories = [] }: FilterBarProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/60 p-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_160px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.query}
            onChange={(event) => onChange({ ...value, query: event.target.value })}
            placeholder="Search title, content, author..."
            className="pl-9"
          />
        </div>

        <Select value={value.category} onValueChange={(category) => onChange({ ...value, category })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.sourceType} onValueChange={(sourceType) => onChange({ ...value, sourceType })}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Source type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

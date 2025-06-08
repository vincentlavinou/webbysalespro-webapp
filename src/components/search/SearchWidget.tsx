"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect, useState } from "react";


export type SearchWidgetProps = {
  className?: string
  placeholder?: string
}

export function SearchWidget({className, placeholder}: SearchWidgetProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchParams.get("search") || "");

    const handleClear = () => {
        const params = new URLSearchParams(window.location.search);
        params.delete("search");
        params.set("page", "1");
        router.push(`?${params.toString()}`);
        setSearch("");
      };
  
    useEffect(() => {
        const delay = setTimeout(() => {
          const params = new URLSearchParams(window.location.search);
    
          // Update search param
          if (search) {
            params.set("search", search);
            params.set("page", "1");
          } else {
            params.delete("search");
          }
    
          router.push(`?${params.toString()}`);
        }, 400); // Debounce URL update
    
        return () => clearTimeout(delay);
      }, [search, router]);
  
    return (
        <div className={className}>
        <Input
          type="text"
          placeholder={placeholder || "Search resources..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl shadow-sm pr-10"
        />
        {search && (
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
}
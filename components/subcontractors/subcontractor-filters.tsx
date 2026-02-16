import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

export type SubcontractorFiltersProps = {
  searchQuery: string
  onSearchChange: (value: string) => void
  availableTrades: string[]
  availableLocations: string[]
  selectedTrade: string
  onSelectTrade: (trade: string) => void
  selectedLocation: string
  onSelectLocation: (loc: string) => void
  ratingMin: number
  onSelectRating: (rating: number) => void
}

export function SubcontractorFilters({
  searchQuery,
  onSearchChange,
  availableTrades = [],
  availableLocations = [],
  selectedTrade,
  onSelectTrade,
  selectedLocation,
  onSelectLocation,
  ratingMin,
  onSelectRating,
}: SubcontractorFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by company name, specialty, or trade"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12 rounded-full border-border focus:border-accent focus:ring-accent"
          />
        </div>
        <Select value={selectedTrade || "ALL"} onValueChange={(v) => onSelectTrade(v === "ALL" ? "" : v)}>
          <SelectTrigger className="h-12 rounded-full w-full lg:w-[160px]">
            <SelectValue placeholder="All Trades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Trades</SelectItem>
            {availableTrades.map((trade) => (
              <SelectItem key={trade} value={trade}>
                {trade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedLocation || "ALL"} onValueChange={(v) => onSelectLocation(v === "ALL" ? "" : v)}>
          <SelectTrigger className="h-12 rounded-full w-full lg:w-[160px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All locations</SelectItem>
            {availableLocations.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(ratingMin)} onValueChange={(v) => onSelectRating(Number(v))}>
          <SelectTrigger className="h-12 rounded-full w-full lg:w-[140px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Any rating</SelectItem>
            <SelectItem value="4">Rating 4.0+</SelectItem>
            <SelectItem value="4.5">Rating 4.5+</SelectItem>
            <SelectItem value="4.8">Rating 4.8+</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

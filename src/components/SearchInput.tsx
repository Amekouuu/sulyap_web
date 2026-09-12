import { Search } from 'lucide-react'
import { useId } from 'react'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search destinations',
  label = 'Search destinations',
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  label?: string
}) {
  const id = useId()
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-b bg-transparent py-2.5 pl-9 pr-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
    </div>
  )
}

import { Construction } from 'lucide-react'

/** Route stub. Replaced screen by screen in phases 5 to 8. */
export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <Construction
        className="mx-auto h-8 w-8 text-muted-foreground"
        aria-hidden="true"
      />
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Route is wired and the shell around it is real. Screen content arrives
        in {phase}.
      </p>
    </div>
  )
}

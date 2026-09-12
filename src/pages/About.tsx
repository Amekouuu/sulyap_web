import { CLASSIFICATION_CRITERIA } from '@/constants/criteria'
import { JURISDICTIONS } from '@/constants/jurisdictions'

export function About() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="font-display text-4xl font-bold leading-tight tracking-tight">
        Why this exists
      </h1>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted-foreground">
        <p>
          Search for somewhere to visit in Pampanga and you get the same
          handful of answers. Ranking by popularity is self-reinforcing: the
          places that already get visitors get recommended, so they get more
          visitors.
        </p>
        <p>
          Sulyap ranks the other way round. Destinations with the least
          engagement appear first, and the ones that become well known sink
          down the list. That is a deliberate bias, not a neutral one &mdash;
          it just points somewhere different.
        </p>
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">
          What counts as lesser-known
        </h2>
        <p className="mt-3 text-muted-foreground">
          A tourism officer checks every nomination against three conditions.
          All three must hold, and the check is done by a person, not a
          script.
        </p>

        <ol className="mt-6 divide-y border-y">
          {CLASSIFICATION_CRITERIA.map((c, i) => (
            <li
              key={c.criterion_id}
              className="grid grid-cols-[2rem_1fr] gap-5 py-5"
            >
              <span className="font-display text-lg tabular-nums text-muted-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-medium">{c.criterion_name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Who reviews submissions</h2>
        <p className="mt-3 text-muted-foreground">
          Each of Pampanga&rsquo;s {JURISDICTIONS.length} cities and
          municipalities has its own tourism officer on Sulyap, and an officer
          only sees submissions inside their own jurisdiction. An
          administrator screens nominations for spam first, then routes them
          on.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Scope</h2>
        <p className="mt-3 text-muted-foreground">
          Pampanga only. No bookings, no payments, no automated verification,
          and no data pulled from Google Maps or TripAdvisor &mdash; the
          comparison against those platforms is made by a person and recorded
          with the date it was checked.
        </p>
      </section>
    </div>
  )
}

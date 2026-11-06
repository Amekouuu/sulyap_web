import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Form';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';

const LANGUAGES = [
  ['english', 'English'],
  ['filipino', 'Filipino'],
  ['kapampangan', 'Kapampangan'],
];

function ProhibitedTerms() {
  const toast = useToast();
  const [language, setLanguage] = useState('all');
  const [q, setQ] = useState('');
  const [version, setVersion] = useState(0);
  const [term, setTerm] = useState('');
  const [newLanguage, setNewLanguage] = useState('filipino');
  const [busy, setBusy] = useState(false);
  const params = new URLSearchParams({ language, v: version });
  if (q.trim()) params.set('q', q.trim());
  const { data, error } = useApi(`/admin/screening/prohibited-terms?${params}`);
  const counts = data?.counts || {};

  async function add(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/admin/screening/prohibited-terms', {
        method: 'POST',
        body: { term: term.trim(), language: newLanguage },
      });
      toast.show(`Added "${term.trim()}".`);
      setTerm('');
      setVersion((v) => v + 1);
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(t) {
    if (!window.confirm(`Remove "${t.term}" from the list?`)) return;
    try {
      await api(`/admin/screening/prohibited-terms/${t.id}`, { method: 'DELETE' });
      setVersion((v) => v + 1);
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    }
  }

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-[15px] text-muted">
        Nominations and reviews that contain one of these words or phrases are blocked. Matching is
        whole-word and also catches look-alike spellings such as &quot;b4d&quot;.
      </p>
      <Card
        as="form"
        onSubmit={add}
        className="grid gap-4 p-5 sm:grid-cols-[1fr_200px_auto] sm:items-end"
      >
        <Field label="Word or phrase">
          {(props) => (
            <Input
              {...props}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              maxLength={255}
            />
          )}
        </Field>
        <Field label="Language">
          {(props) => (
            <Select
              {...props}
              value={newLanguage}
              onChange={(event) => setNewLanguage(event.target.value)}
            >
              {LANGUAGES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Button type="submit" loading={busy} disabled={term.trim().length < 2}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </Card>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          tabs={[['all', 'All'], ...LANGUAGES].map(([value, label]) => ({
            value,
            label,
            count:
              value === 'all'
                ? Object.values(counts).reduce((a, b) => a + b, 0)
                : counts[value] || 0,
          }))}
          value={language}
          onChange={setLanguage}
          label="Language"
        />
        <SearchInput
          label="Search words"
          placeholder="Search words"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="w-full max-w-[300px]"
        />
      </div>
      <Card className="overflow-hidden">
        {!data && !error && <Skeleton className="m-5 h-40" />}
        {error && <EmptyState title="Could not load the list">{error.message}</EmptyState>}
        {data && !data.terms.length && <EmptyState title="No words here" />}
        <ul className="grid grid-cols-1 divide-y divide-sage/70 sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-3">
          {data?.terms.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-5 py-2.5 sm:border-b sm:border-sage/70"
            >
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold">{t.term}</span>
                <span className="text-[12px] capitalize text-muted">{t.language}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(t)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-ctl text-muted hover:bg-pin-50 hover:text-pin"
                aria-label={`Remove ${t.term}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function KnownDestinations() {
  const toast = useToast();
  const towns = useApi('/jurisdictions');
  const [town, setTown] = useState('');
  const [q, setQ] = useState('');
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState({ name: '', jurisdictionId: '', source: '' });
  const [busy, setBusy] = useState(false);
  const params = new URLSearchParams({ v: version });
  if (town) params.set('jurisdictionId', town);
  if (q.trim()) params.set('q', q.trim());
  const { data, error } = useApi(`/admin/screening/known-destinations?${params}`);

  async function add(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api('/admin/screening/known-destinations', {
        method: 'POST',
        body: { ...form, jurisdictionId: Number(form.jurisdictionId) },
      });
      toast.show(`Added ${form.name}.`);
      setForm({ name: '', jurisdictionId: form.jurisdictionId, source: '' });
      setVersion((v) => v + 1);
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(p) {
    if (!window.confirm(`Remove ${p.name} from the list?`)) return;
    try {
      await api(`/admin/screening/known-destinations/${p.id}`, { method: 'DELETE' });
      setVersion((v) => v + 1);
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    }
  }

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const townOptions = towns.data?.jurisdictions || [];

  return (
    <div className="space-y-5">
      <p className="max-w-3xl text-[15px] text-muted">
        Places that are already widely promoted. A nomination with a similar name in the same town
        is flagged for the submitter and shown to you during screening.
      </p>
      <Card
        as="form"
        onSubmit={add}
        className="grid gap-4 p-5 lg:grid-cols-[1fr_220px_1fr_auto] lg:items-end"
      >
        <Field label="Name of the place">
          {(props) => <Input {...props} value={form.name} onChange={set('name')} maxLength={150} />}
        </Field>
        <Field label="City or municipality">
          {(props) => (
            <Select {...props} value={form.jurisdictionId} onChange={set('jurisdictionId')}>
              <option value="">Choose one</option>
              {townOptions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Where it is promoted">
          {(props) => (
            <Input
              {...props}
              value={form.source}
              onChange={set('source')}
              maxLength={255}
              placeholder="Website, guidebook, or office"
            />
          )}
        </Field>
        <Button
          type="submit"
          loading={busy}
          disabled={
            form.name.trim().length < 2 || !form.jurisdictionId || form.source.trim().length < 3
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </Button>
      </Card>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex items-center gap-3 text-[14px]">
          <span className="text-muted">Town</span>
          <select
            value={town}
            onChange={(event) => setTown(event.target.value)}
            className="h-10 rounded-ctl border border-sage bg-surface pl-3 pr-8 text-[14px] font-semibold"
          >
            <option value="">All</option>
            {townOptions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </label>
        <SearchInput
          label="Search places"
          placeholder="Search places"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          className="w-full max-w-[300px]"
        />
      </div>
      <Card className="overflow-hidden">
        {!data && !error && <Skeleton className="m-5 h-40" />}
        {error && <EmptyState title="Could not load the list">{error.message}</EmptyState>}
        {data && !data.places.length && <EmptyState title="No places here" />}
        <ul className="divide-y divide-sage/70">
          {data?.places.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.name}</span>
                <span className="block break-all text-[13px] text-muted">
                  {p.jurisdiction} · {p.source}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(p)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-ctl text-muted hover:bg-pin-50 hover:text-pin"
                aria-label={`Remove ${p.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function ScreeningListsPage() {
  const [list, setList] = useState('terms');
  return (
    <div>
      <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
        Screening Lists
      </h1>
      <p className="mt-1 max-w-3xl text-[16px] text-muted">
        The two lists the automatic checks use. Changes apply to the next submission.
      </p>
      <Tabs
        className="mt-6"
        tabs={[
          { value: 'terms', label: 'Prohibited words' },
          { value: 'places', label: 'Already-promoted places' },
        ]}
        value={list}
        onChange={setList}
        label="List"
      />
      <div className="mt-6">{list === 'terms' ? <ProhibitedTerms /> : <KnownDestinations />}</div>
    </div>
  );
}

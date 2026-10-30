import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';

// Choose which cities and municipalities an officer covers (at least one).
export function OfficerJurisdictionsModal({ officer, onClose, onSaved }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!officer) return;
    setData(null);
    setError('');
    api(`/admin/officers/${officer.id}/jurisdictions`)
      .then((result) => {
        setData(result);
        setSelected(new Set(result.assigned));
      })
      .catch((err) => setError(err.message));
  }, [officer]);

  const all = data?.jurisdictions || [];
  const allSelected = all.length > 0 && selected.size === all.length;
  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  async function save() {
    if (!selected.size) {
      setError('An officer needs at least one jurisdiction.');
      return;
    }
    setBusy(true);
    try {
      await api(`/admin/officers/${officer.id}/jurisdictions`, {
        method: 'PUT',
        body: { jurisdictionIds: [...selected] },
      });
      toast.show('Jurisdictions saved. Their submission queue updates right away.');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const group = (type, title) => (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {all
          .filter((j) => j.type === type)
          .map((j) => (
            <Checkbox
              key={j.id}
              label={j.name}
              checked={selected.has(j.id)}
              onChange={() => toggle(j.id)}
            />
          ))}
      </div>
    </fieldset>
  );

  return (
    <Modal
      open={Boolean(officer)}
      onClose={onClose}
      title="Officer jurisdictions"
      description={
        officer ? `${officer.fullName} only sees nominations from the places checked here.` : ''
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!data}>
            Save
          </Button>
        </>
      }
    >
      {!data && !error && <Skeleton className="h-64 w-full" />}
      {data && (
        <div className="space-y-5">
          <Checkbox
            label={`All ${all.length} cities and municipalities`}
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(all.map((j) => j.id)))}
          />
          {group('city', 'Cities')}
          {group('municipality', 'Municipalities')}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-[14px] font-medium text-pin-700">
          {error}
        </p>
      )}
    </Modal>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, Select, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { REPORT_REASONS } from '@/constants/options';
import { api } from '@/lib/api';

const TITLES = {
  destination: 'Report this destination',
  review: 'Report a review',
  image: 'Report a photo',
};

// Report a destination, a review, or a photo to the administrators.
// target: { type: 'destination' | 'review' | 'image', id, label }
export function ReportModal({ target, onClose, onDone }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function close() {
    if (busy) return;
    setError('');
    setDetails('');
    onClose();
  }

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api('/reports', {
        method: 'POST',
        body: { target: target.type, id: target.id, reason, details: details.trim() },
      });
      setDetails('');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(target)}
      onClose={close}
      title={target ? TITLES[target.type] : ''}
      description={target?.label}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Send report
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Reason" required>
          {(props) => (
            <Select {...props} value={reason} onChange={(event) => setReason(event.target.value)}>
              {REPORT_REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          label="Details"
          optional={reason !== 'Wrong information'}
          required={reason === 'Wrong information'}
          hint="What is wrong? Administrators read every report."
        >
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-[14px] font-medium text-pin-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

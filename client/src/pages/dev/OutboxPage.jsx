import { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

// Development only: e-mails the server "sent" while SMTP is not set up.
// Links inside them work, so the whole sign-up flow can be tested locally.
function Linked({ text }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} className="break-all font-semibold text-forest underline">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function OutboxPage() {
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState('');
  const load = () =>
    api('/dev/outbox')
      .then((data) => setMessages(data.messages))
      .catch((err) => setError(err.message));
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-page px-5 py-12 sm:px-8">
      <p className="font-mono text-[12px] uppercase tracking-wide text-muted">Development only</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[44px] font-extrabold leading-[1.05] tracking-[-0.03em] text-forest">
          Dev outbox
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              api('/dev/newsletter', { method: 'POST', body: {} })
                .then((r) => {
                  setError(
                    r.sent
                      ? ''
                      : `No newsletter sent for ${r.month}: ${r.destinations ? 'no subscribers' : 'no destinations endorsed that month'}.`,
                  );
                  load();
                })
                .catch((err) => setError(err.message))
            }
          >
            Send this month&apos;s newsletter
          </Button>
          <Button variant="secondary" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-[16px] text-muted">
        E-mails are kept here instead of being sent until SMTP is set up. The list empties when the
        API server restarts.
      </p>
      <div className="mt-8 space-y-4">
        {error && (
          <EmptyState icon={Inbox} title="Could not load the outbox">
            {error}
          </EmptyState>
        )}
        {messages && !messages.length && (
          <Card>
            <EmptyState icon={Inbox} title="No e-mails yet">
              Sign up or ask for a new verification link to see one here.
            </EmptyState>
          </Card>
        )}
        {messages?.map((m) => (
          <Card key={m.id} className="p-6">
            <p className="text-[13px] text-muted">
              To {m.to} · {formatDate(m.sentAt)} {new Date(m.sentAt).toLocaleTimeString('en-PH')}
            </p>
            <h2 className="mt-1 text-[18px] font-bold text-charcoal">{m.subject}</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">
              <Linked text={m.text} />
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

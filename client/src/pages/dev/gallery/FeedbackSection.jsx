import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardSection } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { Row, Section } from './Section';

export function FeedbackSection() {
  const [open, setOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const toast = useToast();

  async function checkApi() {
    setHealth('checking');
    try {
      const result = await api('/health');
      setHealth(`API ${result.status}, database ${result.database.replace('_', ' ')}`);
    } catch (error) {
      setHealth(error.message);
    }
  }

  return (
    <Section id="feedback" title="Cards, dialogs and feedback">
      <Row label="Card">
        <Card className="w-full max-w-xl">
          <CardSection title="Basic Information">
            <p className="text-[15px] text-muted">
              Cards hold related fields, as on the nomination form.
            </p>
          </CardSection>
          <CardSection title="Location">
            <p className="text-[15px] text-muted">Sections are separated by a hairline.</p>
          </CardSection>
        </Card>
      </Row>
      <Row label="Empty state">
        <Card className="w-full max-w-xl">
          <EmptyState
            icon={Inbox}
            title="No nominations yet"
            action={<Button size="sm">Add a New Destination</Button>}
          >
            Know a place that deserves a look? Nominate it.
          </EmptyState>
        </Card>
      </Row>
      <Row label="Loading">
        <div className="w-full max-w-xl space-y-3">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </Row>
      <Row label="Dialog and toast">
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast.show('Review submitted. It appears once an administrator approves it.')
          }
        >
          Show toast
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast.show('Could not save. Try again.', { tone: 'error' })}
        >
          Show error toast
        </Button>
      </Row>
      <Row label="API link">
        <Button variant="secondary" onClick={checkApi} loading={health === 'checking'}>
          Check API health
        </Button>
        {health && health !== 'checking' && (
          <p role="status" className="text-[14px] text-charcoal">
            {health}
          </p>
        )}
      </Row>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Write a review"
        description="Bangkung Malapad Mangrove Boardwalk · Sasmuan, Pampanga"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast.show('Review submitted. It appears once an administrator approves it.');
              }}
            >
              Submit review
            </Button>
          </>
        }
      >
        <Field label="Your review" optional>
          {(props) => <Textarea placeholder="What should the next visitor know?" {...props} />}
        </Field>
      </Modal>
    </Section>
  );
}

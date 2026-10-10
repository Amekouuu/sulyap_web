import { useState } from 'react';
import { Pencil, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Form';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tabs } from '@/components/ui/Tabs';
import { JURISDICTION_NAMES } from '@/constants/jurisdictions';
import { Row, Section } from './Section';

const TABS = [
  { value: 'all', label: 'All', count: 13 },
  { value: 'pending', label: 'Pending', count: 2 },
  { value: 'returned', label: 'Returned', count: 1 },
  { value: 'endorsed', label: 'Endorsed', count: 6 },
];

export function ControlsSection() {
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(false);
  return (
    <Section id="controls" title="Controls">
      <Row label="Buttons">
        <Button>
          <Send className="h-4 w-4" aria-hidden="true" />
          Submit nomination
        </Button>
        <Button variant="secondary">Save draft</Button>
        <Button variant="accent">
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit and resubmit
        </Button>
        <Button variant="danger">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>
        <Button variant="ghost">View details</Button>
        <Button
          loading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        >
          Click to load
        </Button>
        <Button disabled>Endorse</Button>
      </Row>
      <Row label="Sizes">
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
      </Row>
      <Row label="Fields">
        <div className="grid w-full max-w-3xl gap-5 md:grid-cols-2">
          <Field label="Destination name" required>
            {(props) => <Input placeholder="Ex: Sapang Uwak Lahar Canyons" {...props} />}
          </Field>
          <Field
            label="Municipality / City"
            required
            hint="Your nomination goes to the tourism officer for this municipality."
          >
            {(props) => (
              <Select defaultValue="" {...props}>
                <option value="" disabled>
                  Select a municipality
                </option>
                {JURISDICTION_NAMES.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="E-mail" required error="Enter a valid e-mail address.">
            {(props) => <Input type="email" defaultValue="juan@" {...props} />}
          </Field>
          <Field label="Operating hours" optional>
            {(props) => <Input placeholder="Ex: Daily, 8:00 AM to 5:00 PM" {...props} />}
          </Field>
          <Field label="Description" required className="md:col-span-2">
            {(props) => (
              <Textarea placeholder="Describe what makes this place worth visiting" {...props} />
            )}
          </Field>
        </div>
      </Row>
      <Row label="Checkboxes">
        <div className="max-w-xl space-y-3">
          <Checkbox
            label="I agree to the Terms of Use and the Data Privacy Notice."
            description="Business owners may not nominate or review their own businesses."
          />
          <Checkbox label="Send me the monthly newsletter of newly endorsed destinations." />
        </div>
      </Row>
      <Row label="Search">
        <SearchInput className="w-full max-w-md" placeholder="Search by name or municipality" />
      </Row>
      <Row label="Filter tabs">
        <Tabs
          tabs={TABS}
          value={tab}
          onChange={setTab}
          label="Destination status"
          className="w-full"
        />
      </Row>
    </Section>
  );
}

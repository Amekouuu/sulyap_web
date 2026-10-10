import { ClipboardList, Hourglass, MapPin, MessageSquare } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import {
  AccountStatusPill,
  CategoryTag,
  EndorsedBadge,
  ModerationPill,
  ReportPill,
  SeasonPill,
  VerificationPill,
  WorkflowPill,
} from '@/components/ui/Pill';
import { StatTile } from '@/components/ui/StatTile';
import { Stepper } from '@/components/ui/Stepper';
import { CATEGORY_NAMES } from '@/constants/categories';
import { ACCOUNT_VERIFICATION, MODERATION, REPORT, WORKFLOW } from '@/constants/status';
import { Row, Section } from './Section';

const STEPS = ['Submitted', 'Screened by admin', 'Checked by tourism officer'];

export function StatusSection() {
  return (
    <Section
      id="status"
      title="Status and labels"
      note="Each workflow status reads differently for the submitter, the admin, and the officer."
    >
      {['submitter', 'admin', 'officer'].map((audience) => (
        <Row key={audience} label={`Workflow: ${audience}`}>
          {Object.keys(WORKFLOW).map((status) => (
            <WorkflowPill key={status} status={status} audience={audience} />
          ))}
        </Row>
      ))}
      <Row label="Reviews, photos">
        {Object.keys(MODERATION).map((status) => (
          <ModerationPill key={status} status={status} />
        ))}
      </Row>
      <Row label="Reports">
        {Object.keys(REPORT).map((status) => (
          <ReportPill key={status} status={status} />
        ))}
      </Row>
      <Row label="Accounts">
        {Object.keys(ACCOUNT_VERIFICATION).map((status) => (
          <VerificationPill key={status} status={status} />
        ))}
        <AccountStatusPill status="active" />
        <AccountStatusPill status="suspended" />
      </Row>
      <Row label="Public badges">
        <EndorsedBadge />
        <SeasonPill season="Summer" />
        <SeasonPill season="Rainy" />
        {CATEGORY_NAMES.map((name) => (
          <CategoryTag key={name} name={name} withIcon />
        ))}
      </Row>
      <Row label="Progress">
        <div className="space-y-3">
          <Stepper steps={STEPS} done={1} />
          <Stepper steps={STEPS} done={2} />
          <Stepper steps={STEPS} done={3} />
        </div>
      </Row>
      <Row label="Avatars">
        <Avatar name="Juan Dela Cruz" />
        <Avatar name="Sulyap Administrator" strong />
        <Avatar name="Tourism Officer" strong size="lg" />
        <Avatar name="Ana Reyes" size="sm" />
      </Row>
      <Row label="Dashboard tiles">
        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile tone="forest" icon={MapPin} value={13} label="Destinations" />
          <StatTile tone="gold" icon={Hourglass} value={2} label="Pending destinations" />
          <StatTile tone="minty" icon={MessageSquare} value={10} label="Community content" />
          <StatTile tone="terracotta" icon={ClipboardList} value={3} label="Open reports" />
        </div>
      </Row>
    </Section>
  );
}

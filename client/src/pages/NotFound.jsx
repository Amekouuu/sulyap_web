import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotFound() {
  return (
    <div className="mx-auto max-w-page px-5 py-20 sm:px-8">
      <EmptyState
        icon={Compass}
        title="This page does not exist"
        action={<ButtonLink to="/">Back to Home</ButtonLink>}
      >
        The link may be old or mistyped. You can keep exploring lesser-known places from the home
        page.
      </EmptyState>
    </div>
  );
}

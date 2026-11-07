import { Suspense, lazy, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/session/SessionContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';

const PinPicker = lazy(() => import('@/components/map/PinPicker'));

// Sets the Registered User's home location for Nearby Lesser-Known: type an address (looked up
// on OpenStreetMap) or drop a pin on the map. onSaved(user) runs after a successful save.
export function HomeLocationForm({ onSaved, onCancel }) {
  const { setUser } = useSession();
  const toast = useToast();
  const [mode, setMode] = useState('address');
  const [address, setAddress] = useState('');
  const [results, setResults] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [pin, setPin] = useState(null);
  const [pinLabel, setPinLabel] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function lookUp(event) {
    event.preventDefault();
    setError('');
    setChosen(null);
    if (address.trim().length < 3) {
      setError('Type your address, for example "Sto. Domingo, Angeles City".');
      return;
    }
    setBusy(true);
    try {
      const data = await api('/account/home/lookup', { method: 'POST', body: { address } });
      setResults(data.results);
      if (data.results.length === 1) setChosen(data.results[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const location =
      mode === 'address'
        ? {
            address: chosen.label.slice(0, 255),
            latitude: chosen.latitude,
            longitude: chosen.longitude,
          }
        : { address: pinLabel.trim() || null, ...pin };
    setBusy(true);
    setError('');
    try {
      const data = await api('/account/home', { method: 'PUT', body: location });
      setUser(data.user);
      toast.show('Home location saved.');
      onSaved?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex rounded-[10px] border border-sage p-1"
        role="group"
        aria-label="How to set your home location"
      >
        {[
          ['address', 'Type my address'],
          ['pin', 'Drop a pin'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setError('');
            }}
            className={cn(
              'h-10 flex-1 rounded-[8px] text-[14px] font-semibold',
              mode === value ? 'bg-forest text-white' : 'text-charcoal hover:bg-cream',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'address' ? (
        <>
          <form onSubmit={lookUp} noValidate className="flex items-end gap-2">
            <Field label="Home address" className="min-w-0 flex-1">
              {(props) => (
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Barangay, city or municipality"
                  autoComplete="street-address"
                  maxLength={255}
                  {...props}
                />
              )}
            </Field>
            <Button
              type="submit"
              variant="secondary"
              loading={busy && mode === 'address' && !chosen}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </Button>
          </form>
          {results && !results.length && (
            <p className="text-[14px] text-muted">
              No match found. Try adding the city or municipality, or drop a pin instead.
            </p>
          )}
          {results?.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-[14px] font-semibold">Which one is it?</legend>
              {results.map((r) => (
                <label
                  key={`${r.latitude},${r.longitude}`}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-[10px] border p-3 text-[14px]',
                    chosen === r ? 'border-forest bg-minty-50' : 'border-sage hover:bg-cream',
                  )}
                >
                  <input
                    type="radio"
                    name="home-result"
                    checked={chosen === r}
                    onChange={() => setChosen(r)}
                    className="mt-1 accent-[#234638]"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>
          )}
          <p className="text-[12px] text-muted">
            Address search by OpenStreetMap. Only the address you type is sent.
          </p>
        </>
      ) : (
        <>
          <p className="text-[14px] text-muted">
            Click where you live, then drag the pin to adjust. The map covers Pampanga; if you live
            elsewhere, type your address instead.
          </p>
          <Suspense fallback={<Skeleton className="h-[320px] w-full" />}>
            <PinPicker
              value={pin}
              onChange={setPin}
              onOutside={() => setError('The map covers Pampanga only. Type your address instead.')}
              className="h-[320px]"
            />
          </Suspense>
          <Field label="Label" optional>
            {(props) => (
              <Input
                value={pinLabel}
                onChange={(e) => setPinLabel(e.target.value)}
                placeholder="For example: Brgy. Sto. Rosario"
                maxLength={255}
                {...props}
              />
            )}
          </Field>
        </>
      )}

      {error && (
        <p role="alert" className="text-[14px] text-terracotta-700">
          {error}
        </p>
      )}

      <p className="text-[13px] text-muted">
        Your home location is only used to find places near you. Other users never see it.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          loading={busy && (mode === 'pin' || Boolean(chosen))}
          disabled={mode === 'address' ? !chosen : !pin}
          onClick={save}
        >
          Save home location
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

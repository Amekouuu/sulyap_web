import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { SkipLink } from '@/components/shell/SkipLink';
import { DevRoleSwitcher } from '@/components/DevRoleSwitcher';

// Split screen from the mockup: photo on the left, form on the right.
export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <SkipLink />
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="/images/auth-arayat.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/25 via-transparent to-charcoal/45" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo light size="lg" />
          <p className="text-[13px] text-white/85">
            Photo: Mount Arayat from the City of San Fernando
          </p>
        </div>
      </div>
      <main id="main" className="flex flex-col bg-cream">
        <div className="px-6 pt-8 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[480px]">
            <Outlet />
          </div>
        </div>
      </main>
      <DevRoleSwitcher />
    </div>
  );
}

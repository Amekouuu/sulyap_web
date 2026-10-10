// First focusable element on every page: lets keyboard users jump past the navigation.
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-ctl focus:bg-forest focus:px-4 focus:py-2 focus:text-white"
    >
      Skip to content
    </a>
  );
}

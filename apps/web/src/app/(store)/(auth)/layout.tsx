/** Narrow, centred column shared by the sign-in and sign-up pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="page-container flex flex-1 justify-center py-16 sm:py-24">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}

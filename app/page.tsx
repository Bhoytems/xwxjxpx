import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-ink">
      <div className="text-center">
        <h1 className="font-display text-3xl text-paper mb-2">Web3 Junkies</h1>
        <p className="text-paper/60 mb-6">Community task &amp; rewards console.</p>
        <Link
          href="/admin"
          className="inline-block px-5 py-2.5 rounded-sm bg-gold text-ink font-medium hover:bg-gold2 transition-colors"
        >
          Open admin console
        </Link>
      </div>
    </main>
  );
}

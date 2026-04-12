import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className="text-sm font-medium tracking-tight text-gray-200">
            Energy Vis
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="text-sm font-medium text-blue-400">Visualizations</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          US energy &amp; infrastructure
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400">
          Explore interactive maps of the power grid, interconnection queues,
          and how AI datacenter buildout intersects with generation and
          transmission.
        </p>

        <ul className="mt-12 space-y-4">
          <li>
            <Link
              href="/ai-power-map"
              className="group flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-5 py-4 transition hover:border-gray-700 hover:bg-gray-900"
            >
              <div>
                <h2 className="font-medium text-gray-100">AI Power Map</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Datacenters, plants, queues, and transmission — where AI meets
                  the grid.
                </p>
              </div>
              <span
                className="ml-4 shrink-0 text-gray-500 transition group-hover:text-blue-400"
                aria-hidden
              >
                →
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/power-management"
              className="group flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/50 px-5 py-4 transition hover:border-gray-700 hover:bg-gray-900"
            >
              <div>
                <h2 className="font-medium text-gray-100">
                  Fleet age &amp; power management
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  EIA-based capacity-weighted vintage — a public baseline for
                  asset diligence and O&amp;M context.
                </p>
              </div>
              <span
                className="ml-4 shrink-0 text-gray-500 transition group-hover:text-amber-400"
                aria-hidden
              >
                →
              </span>
            </Link>
          </li>
        </ul>
      </main>

      <footer className="border-t border-gray-800/80 py-8">
        <div className="mx-auto max-w-3xl px-6 text-center text-xs text-gray-600">
          Deep links:{" "}
          <code className="rounded bg-gray-900 px-1.5 py-0.5 text-gray-400">
            /ai-power-map
          </code>
          ,{" "}
          <code className="rounded bg-gray-900 px-1.5 py-0.5 text-gray-400">
            /power-management
          </code>
          .
        </div>
      </footer>
    </div>
  );
}

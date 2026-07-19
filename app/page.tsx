import UrlShortener from "@/components/UrlShortener";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Shorten links. Understand clicks.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
          Shortly is a self-hostable URL shortener with built-in click analytics,
          SSRF protection, and zero external dependencies for local use.
        </p>
      </section>

      <UrlShortener />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Feature
          title="Privacy-aware"
          body="Raw click events are capped and aggregated daily. No third-party trackers."
        />
        <Feature
          title="SSRF guard"
          body="Private, internal and cloud-metadata targets are rejected by default."
        />
        <Feature
          title="Pluggable store"
          body="Runs on a local JSON file, or Upstash Redis for serverless scale."
        />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">{body}</p>
    </div>
  );
}

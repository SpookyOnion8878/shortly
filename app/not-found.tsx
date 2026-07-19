import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card text-center">
      <h1 className="text-xl font-bold">Link not found</h1>
      <p className="mt-2 text-sm text-slate-400">
        This short link doesn’t exist or has expired.
      </p>
      <Link href="/" className="mt-4 inline-block btn-primary">
        Create a new link
      </Link>
    </div>
  );
}

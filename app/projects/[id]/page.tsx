import { Preview } from "../../../components/preview";

export default function ProjectPage(): React.JSX.Element {
  // MVP: deep links land here; the canonical canvas lives at /.
  // Kept small intentionally; project persistence arrives with Postgres later.
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-lg font-bold">Project</h1>
      <p className="text-sm text-slate-400">
        Version deep-links resolve on the main canvas in this MVP. Open the homepage to generate.
      </p>
      <Preview spec={null} loading={false} error={null} />
    </main>
  );
}

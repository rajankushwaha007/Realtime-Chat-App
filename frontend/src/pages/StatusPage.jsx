import StatusSection from "../components/StatusSection";
import PageBackButton from "../components/PageBackButton";

const StatusPage = () => {
  return (
    <main className="min-h-screen bg-base-200 p-4 md:p-6">
      <div className="mx-auto min-h-[calc(100dvh-3rem)] max-w-3xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="flex items-center gap-3 border-b border-base-300 px-4 py-4">
          <PageBackButton fallback="/" />

          <div>
            <h1 className="text-xl font-bold">Status</h1>
            <p className="mt-1 text-sm opacity-60">
              Share moments with your contacts
            </p>
          </div>
        </div>

        <div className="p-4">
          <StatusSection />
        </div>
      </div>
    </main>
  );
};

export default StatusPage;
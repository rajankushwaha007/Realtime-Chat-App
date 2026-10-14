import StatusSection from "../components/StatusSection";

const StatusPage = () => {
  return (
    <main className="min-h-screen bg-base-200 p-4 md:p-6">
      <div className="mx-auto min-h-[calc(100dvh-3rem)] max-w-3xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 px-5 py-4">
          <h1 className="text-xl font-bold">Status</h1>
          <p className="mt-1 text-sm opacity-60">
            Share moments with your contacts
          </p>
        </div>

        <div className="p-4">
          <StatusSection />
        </div>
      </div>
    </main>
  );
};

export default StatusPage;
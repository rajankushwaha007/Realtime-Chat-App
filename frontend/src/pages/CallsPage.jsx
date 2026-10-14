import { Phone, Video, Clock } from "lucide-react";

const CallsPage = () => {
  return (
    <main className="min-h-screen bg-base-200 p-4 md:p-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 px-5 py-4">
          <h1 className="text-xl font-bold">Calls</h1>
          <p className="mt-1 text-sm opacity-60">
            Audio and video calling
          </p>
        </div>

        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-primary/10">
            <Phone size={36} className="text-primary" />
          </div>

          <h2 className="text-lg font-semibold">
            Your calls
          </h2>

          <p className="mt-2 max-w-sm text-sm opacity-60">
            Your existing audio and video calling features remain available.
            Call history can be connected when call records are stored.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-base-200 px-4 py-3 text-sm">
              <Phone size={18} />
              Audio calls
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-base-200 px-4 py-3 text-sm">
              <Video size={18} />
              Video calls
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-base-200 px-4 py-3 text-sm">
              <Clock size={18} />
              Call history
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CallsPage;

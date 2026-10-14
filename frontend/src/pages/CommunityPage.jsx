
import { Users, MessageCircle } from "lucide-react";

const CommunityPage = () => {
  return (
    <main className="min-h-screen bg-base-200 p-4 md:p-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm">
        <div className="border-b border-base-300 px-5 py-4">
          <h1 className="text-xl font-bold">Communities</h1>
          <p className="mt-1 text-sm opacity-60">
            Bring groups together in one place
          </p>
        </div>

        <div className="flex flex-col items-center px-6 py-16 text-center">
          <div className="mb-5 flex size-20 items-center justify-center rounded-full bg-primary/10">
            <Users size={38} className="text-primary" />
          </div>

          <h2 className="text-lg font-semibold">
            Your communities
          </h2>

          <p className="mt-2 max-w-sm text-sm opacity-60">
            Community creation and group management can be added here next.
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-lg bg-base-200 px-4 py-3 text-sm">
            <MessageCircle size={18} />
            <span>Your existing one-to-one chats remain unchanged.</span>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CommunityPage;
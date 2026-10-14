import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  CircleDot,
  Users,
  Phone,
  Settings,
  LogOut,
} from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { authUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const openSection = (path) => {
    setSelectedUser(null);
    navigate(path);
  };

  return (
    <main className="h-[100dvh] bg-base-200 overflow-hidden">
      <div className="flex h-full w-full overflow-hidden bg-base-100">

        {/* Desktop left navigation */}
        <aside className="hidden md:flex w-[76px] shrink-0 flex-col items-center border-r border-base-300 bg-base-200 py-4">
          <button
            onClick={() => openSection("/")}
            className="mb-8 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-content"
            title="Chatty"
          >
            <MessageCircle size={25} />
          </button>

          <nav className="flex flex-1 flex-col items-center gap-4">
            <button onClick={() => openSection("/")} className="btn btn-ghost btn-circle" title="Chats">
              <MessageCircle size={23} />
            </button>

            <button onClick={() => openSection("/status")} className="btn btn-ghost btn-circle" title="Status">
              <CircleDot size={23} />
            </button>

            <button onClick={() => openSection("/community")} className="btn btn-ghost btn-circle" title="Community">
              <Users size={23} />
            </button>

            <button onClick={() => openSection("/calls")} className="btn btn-ghost btn-circle" title="Calls">
              <Phone size={23} />
            </button>
          </nav>

          <div className="mt-auto flex flex-col items-center gap-4">
            <button onClick={() => navigate("/settings")} className="btn btn-ghost btn-circle" title="Settings">
              <Settings size={22} />
            </button>

            <button onClick={() => navigate("/profile")} title="Profile" className="rounded-full">
              <img
                src={authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-10 rounded-full border-2 border-base-300 object-cover"
              />
            </button>

            <button onClick={logout} className="btn btn-ghost btn-circle" title="Logout">
              <LogOut size={21} />
            </button>
          </div>
        </aside>

        {/* Chat list */}
        <section
          className={`h-full w-full flex-col md:flex md:w-80 md:shrink-0 ${
            selectedUser ? "hidden" : "flex"
          }`}
        >
          <div className="border-b border-base-300 bg-base-100 px-4 py-4">
            <h1 className="text-xl font-bold text-primary">Chatty</h1>
            <p className="mt-1 text-sm opacity-60">Stay connected</p>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <Sidebar />
          </div>

          {/* Mobile bottom navigation */}
          <nav className="grid grid-cols-4 border-t border-base-300 bg-base-100 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 md:hidden">
            <button onClick={() => openSection("/")} className="flex flex-col items-center gap-1 py-2">
              <MessageCircle size={22} />
              <span className="text-xs font-medium">Chats</span>
            </button>

            <button onClick={() => openSection("/status")} className="flex flex-col items-center gap-1 py-2">
              <CircleDot size={22} />
              <span className="text-xs">Status</span>
            </button>

            <button onClick={() => openSection("/community")} className="flex flex-col items-center gap-1 py-2">
              <Users size={22} />
              <span className="text-xs">Community</span>
            </button>

            <button onClick={() => openSection("/calls")} className="flex flex-col items-center gap-1 py-2">
              <Phone size={22} />
              <span className="text-xs">Calls</span>
            </button>
          </nav>
        </section>

        {/* Conversation */}
        <section
          className={`min-w-0 flex-1 flex-col ${
            selectedUser ? "flex" : "hidden md:flex"
          }`}
        >
          {selectedUser ? (
            <>
              <div className="flex items-center gap-2 border-b border-base-300 bg-base-100 px-3 py-2 md:hidden">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="btn btn-ghost btn-circle btn-sm"
                  aria-label="Back to chats"
                >
                  <ArrowLeft size={22} />
                </button>

                <img
                  src={selectedUser.profilePic || "/avatar.png"}
                  alt=""
                  className="size-9 rounded-full object-cover"
                />

                <span className="truncate font-semibold">
                  {selectedUser.fullName}
                </span>
              </div>

              <div className="min-h-0 flex-1">
                <ChatContainer />
              </div>
            </>
          ) : (
            <NoChatSelected />
          )}
        </section>
      </div>
    </main>
  );
};

export default HomePage;
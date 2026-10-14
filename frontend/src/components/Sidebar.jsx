import { useEffect, useMemo, useState } from "react";
import { Search, Users, MessageCircle, NotebookPen } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";

const Sidebar = () => {
  const {
    users,
    getUsers,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...users]
      .filter((user) =>
        `${user.fullName || ""} ${user.email || ""}`
          .toLowerCase()
          .includes(query)
      )
      .sort((a, b) => {
        const timeA = a.lastMessageAt
          ? new Date(a.lastMessageAt).getTime()
          : 0;
        const timeB = b.lastMessageAt
          ? new Date(b.lastMessageAt).getTime()
          : 0;

        return timeB - timeA;
      });
  }, [users, search]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-base-300 bg-base-100">
      <div className="border-b border-base-300 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Chats</h2>
            <p className="text-xs text-base-content/60">
              {users.length} registered users
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users size={20} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/notes";
          }}
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-base-300 bg-base-200 px-4 py-3 text-left transition-colors hover:bg-base-300"
        >
          <span className="flex items-center gap-3">
            <NotebookPen size={20} className="text-primary" />
            <span className="font-semibold">My Notes</span>
          </span>

          <span className="text-sm text-base-content/60">Open →</span>
        </button>


        <label className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-200 px-3">
          <Search size={18} className="shrink-0 opacity-60" />

          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-sm w-full border-0 bg-transparent focus:outline-none"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isUsersLoading ? (
          <SidebarSkeleton />
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-base-content/60">
            <MessageCircle size={32} />
            <p className="font-medium">
              {search ? "No users found" : "No registered users found"}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isOnline = onlineUsers?.some(
              (id) => String(id) === String(user._id)
            );

            const isSelected =
              String(selectedUser?._id) === String(user._id);

            return (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`flex w-full items-center gap-3 border-b border-base-300/50 p-3 text-left transition-colors hover:bg-base-200 ${isSelected ? "bg-base-200" : ""
                  }`}
              >
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt={user.fullName || "User"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user.fullName || user.email || "U")
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-base-100 bg-success" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">
                      {user.fullName || user.email || "Unknown User"}
                    </p>

                    {user.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-success px-1 text-xs font-bold text-white">
                        {user.unreadCount}
                      </span>
                    )}
                  </div>

                  <p className="truncate text-sm text-base-content/60">
                    {user.lastMessage
                      ? user.lastMessage.image && !user.lastMessage.text
                        ? "📷 Photo"
                        : user.lastMessage.text || "Message"
                      : isOnline
                        ? "Online"
                        : "Start a conversation"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
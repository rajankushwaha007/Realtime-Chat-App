
import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, typingUsers } = useChatStore();
  const { onlineUsers, userStatuses } = useAuthStore();

  const isTyping = Boolean(typingUsers[userId]);
  const isOnline = onlineUsers.some(
    (id) => String(id) === userId
  );

  const lastSeen = userStatuses[userId]?.lastSeen;

  const getStatusText = () => {
    if (isOnline) return "Online";

    if (lastSeen) {
      const date = new Date(lastSeen);

      if (!Number.isNaN(date.getTime())) {
        return `Last seen ${date.toLocaleString([], {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
    }

    return "Offline";
  };

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
              />
              {isOnline && (
                <span className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 ring-2 ring-base-100" />
              )}
            </div>
          </div>

          {/* User info */}
          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p
              className={`text-sm ${isTyping ? "text-success font-medium" : "text-base-content/70"
                }`}
            >
              {isTyping ? "typing..." : getStatusText()}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button onClick={() => setSelectedUser(null)}>
          <X />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
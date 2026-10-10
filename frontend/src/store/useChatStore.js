import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  typingUsers: {},
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },


  getMessages: async (userId) => {
    set({ isMessagesLoading: true });

    try {
      const res = await axiosInstance.get(`/messages/${userId}`);

      set({ messages: res.data });

      // Chat open hone par incoming messages Seen mark karo
      const socket = useAuthStore.getState().socket;
      const authUser = useAuthStore.getState().authUser;

      if (socket && authUser) {
        socket.emit("markMessagesSeen", {
          senderId: userId,
        });
      }
    } catch (error) {
      console.error("Get messages error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load messages"
      );
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  editMessage: async (messageId, text) => {
    try {
      const res = await axiosInstance.patch(
        `/messages/edit/${messageId}`,
        { text }
      );

      set((state) => ({
        messages: state.messages.map((message) =>
          String(message._id) === String(messageId)
            ? res.data
            : message
        ),
      }));

      toast.success("Message edited successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to edit message"
      );
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/messages/delete/${messageId}`);

      set((state) => ({
        messages: state.messages.filter(
          (message) => String(message._id) !== String(messageId)
        ),
      }));

      toast.success("Message deleted successfully");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete message"
      );
    }
  },

  deleteMessageForMe: async (messageId) => {
    try {
      await axiosInstance.patch(
        `/messages/delete-for-me/${messageId}`
      );

      set((state) => ({
        messages: state.messages.filter(
          (message) => String(message._id) !== String(messageId)
        ),
      }));

      toast.success("Message deleted for you");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to delete message"
      );
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageStatusUpdated");
    socket.off("messageReactionUpdated");
    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("userTyping");
    socket.off("userStoppedTyping");

    socket.on("userTyping", ({ userId }) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [String(userId)]: true,
        },
      }));
    });

    socket.on("userStoppedTyping", ({ userId }) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [String(userId)]: false,
        },
      }));
    });

    socket.on("newMessage", (newMessage) => {
      const currentSelectedUser = get().selectedUser;
      const currentUser = useAuthStore.getState().authUser;

      if (!currentUser) return;

      const isFromSelectedUser =
        String(newMessage.senderId) ===
        String(currentSelectedUser?._id);

      if (isFromSelectedUser) {
        set((state) => ({
          messages: state.messages.some(
            (message) =>
              String(message._id) === String(newMessage._id)
          )
            ? state.messages
            : [...state.messages, newMessage],
        }));

        socket.emit("markMessagesSeen", {
          senderId: newMessage.senderId,
        });
      } else {
        socket.emit("messageDelivered", {
          messageId: newMessage._id,
        });
      }
    });

    socket.on("messageStatusUpdated", ({ messageIds, status }) => {
      const ids = (messageIds || []).map(String);

      set((state) => ({
        messages: state.messages.map((message) =>
          ids.includes(String(message._id))
            ? { ...message, status }
            : message
        ),
      }));
    });

    socket.on("messageReactionUpdated", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((message) =>
          String(message._id) === String(messageId)
            ? { ...message, reactions }
            : message
        ),
      }));
    });

    socket.on("messageEdited", (updatedMessage) => {
      set((state) => ({
        messages: state.messages.map((message) =>
          String(message._id) === String(updatedMessage._id)
            ? updatedMessage
            : message
        ),
      }));
    });

    socket.on("messageDeleted", ({ messageId }) => {
      set((state) => ({
        messages: state.messages.filter(
          (message) => String(message._id) !== String(messageId)
        ),
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.off("newMessage");
    socket.off("messageStatusUpdated");
    socket.off("messageReactionUpdated");
    socket.off("messageEdited");
    socket.off("messageDeleted");
    socket.off("userTyping");
    socket.off("userStoppedTyping");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));

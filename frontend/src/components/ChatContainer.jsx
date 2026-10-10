import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    editMessage,
    deleteMessage,
    deleteMessageForMe,
  } = useChatStore();


  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const [showFullReactionPicker, setShowFullReactionPicker] = useState(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");

  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  const startLongPress = (messageId) => {
    longPressTriggered.current = false;

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setActiveMessageMenu(messageId);
      setActiveReactionMessage(null);
    }, 1000);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };



  const reactionEmojis = ["❤️", "😂", "👍", "😮", "😢", "🔥"];

  const handleReaction = (messageId, emoji) => {
    const socket = useAuthStore.getState().socket;

    if (!socket) return;

    socket.emit("messageReaction", { messageId, emoji });
    setActiveReactionMessage(null);
  };

  const startEditing = (message) => {
    setEditingMessageId(message._id);
    setEditedText(message.text || "");
    setActiveReactionMessage(null);
  };

  const saveEditedMessage = async (messageId) => {
    if (!editedText.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    await editMessage(messageId, editedText);
    setEditingMessageId(null);
    setEditedText("");
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditedText("");
  };


  useEffect(() => {
    if (!selectedUser?._id) return;

    getMessages(selectedUser._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    selectedUser?._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const hidePicker = () => {
      setActiveReactionMessage(null);
      setShowFullReactionPicker(null);
      setActiveMessageMenu(null);
    };

    document.addEventListener("click", hidePicker);

    return () => {
      document.removeEventListener("click", hidePicker);

      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage =
            String(message.senderId) === String(authUser?._id);

          const reactions = message.reactions || [];

          const groupedReactions = reactions.reduce((groups, reaction) => {
            const emoji = reaction.emoji;

            if (!groups[emoji]) {
              groups[emoji] = {
                emoji,
                count: 0,
                userIds: [],
              };
            }

            groups[emoji].count += 1;
            groups[emoji].userIds.push(String(reaction.userId));

            return groups;
          }, {});


          return (
            <div
              key={message._id}
              className={`chat relative ${isOwnMessage ? "chat-end" : "chat-start"}`}
              ref={messageEndRef}
            >

              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isOwnMessage
                        ? authUser?.profilePic || "/avatar.png"
                        : selectedUser?.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>

              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>



              <div
                className="chat-bubble flex flex-col select-none"
                style={{ touchAction: "pan-y", overflowWrap: "anywhere" }}
                onMouseDown={() => startLongPress(message._id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(message._id)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
                draggable={false}
              >


                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}


                {editingMessageId === message._id ? (
                  <div
                    className="flex flex-col gap-2 min-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <textarea
                      className="textarea textarea-bordered w-full text-base-content"
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      rows={3}
                      autoFocus
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-success btn-xs"
                        onClick={() => saveEditedMessage(message._id)}
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {message.text && <p>{message.text}</p>}
                    {message.edited && (
                      <span className="text-xs opacity-60 italic mt-1">
                        Edited
                      </span>
                    )}
                  </>
                )}


                {isOwnMessage && (
                  <div className="flex justify-end items-center mt-1">
                    {message.status === "seen" ? (
                      <span
                        className="text-blue-400 text-xs font-bold"
                        title="Seen"
                      >
                        ✓✓
                      </span>
                    ) : message.status === "delivered" ? (
                      <span
                        className="text-gray-400 text-xs font-bold"
                        title="Delivered"
                      >
                        ✓✓
                      </span>
                    ) : (
                      <span
                        className="text-gray-400 text-xs"
                        title="Sent"
                      >
                        ✓
                      </span>
                    )}
                  </div>
                )}
              </div>

              {activeMessageMenu === message._id && (
                <div

                  className="absolute z-50 left-0 top-full mt-1 flex flex-wrap gap-2 justify-start rounded-lg bg-base-100 p-2 shadow-lg"

                  onClick={(e) => e.stopPropagation()}
                >
                  {isOwnMessage ? (
                    <>
                      {message.text && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            startEditing(message);
                            setActiveMessageMenu(null);
                          }}
                        >
                          Edit
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => {
                          setActiveMessageMenu(null);

                          if (window.confirm("Delete this message permanently?")) {
                            deleteMessage(message._id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => {
                          setActiveMessageMenu(null);

                          if (window.confirm("Delete this message for you?")) {
                            deleteMessageForMe(message._id);
                          }
                        }}
                      >
                        Delete for me
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => setActiveMessageMenu(null)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Display existing reactions */}
              {Object.keys(groupedReactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.values(groupedReactions).map((reaction) => (
                    <button
                      key={reaction.emoji}
                      type="button"
                      title={`${reaction.count} reaction(s)`}
                      onClick={() =>
                        handleReaction(message._id, reaction.emoji)
                      }
                      className={`badge badge-lg cursor-pointer ${reaction.userIds.includes(String(authUser?._id))
                        ? "badge-primary"
                        : "badge-ghost"
                        }`}
                    >
                      {reaction.emoji} {reaction.count}
                    </button>
                  ))}
                </div>
              )}



              {/* Reaction picker: only visible after long press */}
              {activeReactionMessage === message._id && (
                <div
                  className="flex flex-wrap items-center gap-1 p-2 rounded-lg bg-base-200 shadow-md mt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {reactionEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="btn btn-ghost btn-sm text-lg"
                      title={`React ${emoji}`}
                      onClick={() => handleReaction(message._id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}

                  {/* Plus button for full emoji picker */}
                  <button
                    type="button"
                    className="btn btn-circle btn-sm btn-ghost text-xl"
                    title="More emojis"
                    onClick={() =>
                      setShowFullReactionPicker((current) =>
                        current === message._id ? null : message._id
                      )
                    }
                  >
                    +
                  </button>
                </div>
              )}

              {showFullReactionPicker === message._id && (
                <div
                  className="mt-2 relative z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      handleReaction(message._id, emojiData.emoji);
                      setShowFullReactionPicker(null);
                    }}
                    height={350}
                    width={300}
                  />
                </div>
              )}


            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
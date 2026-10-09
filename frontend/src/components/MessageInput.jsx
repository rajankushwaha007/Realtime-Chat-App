import { useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance } from "../lib/axios";
import {
  Image,
  Send,
  X,
  Sparkles,
  LoaderCircle,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Chat Summary states
  const [summary, setSummary] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);

  const fileInputRef = useRef(null);
  const { sendMessage, selectedUser } = useChatStore();

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerateReplies = async () => {
    if (!selectedUser?._id) {
      toast.error("Please select a chat first");
      return;
    }

    setIsGenerating(true);
    setSuggestions([]);

    try {
      const response = await axiosInstance.post("/ai/smart-reply", {
        userId: selectedUser._id,
      });

      if (
        response.data.success &&
        Array.isArray(response.data.suggestions)
      ) {
        setSuggestions(response.data.suggestions);
      } else {
        toast.error("Could not generate replies");
      }
    } catch (error) {
      console.error(
        "AI Smart Reply Error:",
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to generate replies. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate AI Chat Summary
  const handleGenerateSummary = async () => {
    if (!selectedUser?._id) {
      toast.error("Please select a chat first");
      return;
    }

    setIsSummarizing(true);
    setSummary("");

    try {
      const response = await axiosInstance.post("/ai/summary", {
        userId: selectedUser._id,
      });

      if (response.data.success && response.data.summary) {
        setSummary(response.data.summary);
      } else {
        toast.error("Could not generate chat summary");
      }
    } catch (error) {
      console.error(
        "AI Chat Summary Error:",
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message ||
          "Failed to generate summary. Please try again."
      );
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!text.trim() && !imagePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
      });

      setText("");
      setImagePreview(null);
      setSuggestions([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    setText(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="p-4 w-full">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />

            <button
              onClick={removeImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
              aria-label="Remove image"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      {/* AI feature buttons */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerateReplies}
          disabled={isGenerating || !selectedUser}
          className="btn btn-sm btn-outline gap-2"
        >
          {isGenerating ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}

          {isGenerating ? "Generating replies..." : "AI Smart Reply"}
        </button>

        <button
          type="button"
          onClick={handleGenerateSummary}
          disabled={isSummarizing || !selectedUser}
          className="btn btn-sm btn-outline gap-2"
        >
          {isSummarizing ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <FileText className="size-4" />
          )}

          {isSummarizing ? "Summarizing..." : "AI Chat Summary"}
        </button>
      </div>

      {/* AI Chat Summary display */}
      {summary && (
        <div className="mb-4 rounded-xl border border-base-300 bg-base-200 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold">
              <FileText className="size-5" />
              Conversation Summary
            </h3>

            <button
              type="button"
              onClick={() => setSummary("")}
              className="btn btn-ghost btn-xs btn-circle"
              aria-label="Close summary"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {summary}
          </div>
        </div>
      )}

      {/* Smart Reply suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="text-xs text-base-content/60">
            ✨ AI suggestions — click one to use it
          </p>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${index}-${suggestion}`}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="btn btn-sm rounded-xl normal-case font-normal"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message input */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2"
      >
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageChange}
          />

          <button
            type="button"
            aria-label="Attach image"
            className={`hidden sm:flex btn btn-circle ${
              imagePreview ? "text-emerald-500" : "text-zinc-400"
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Image size={20} />
          </button>
        </div>

        <button
          type="submit"
          className="btn btn-sm btn-circle"
          disabled={!text.trim() && !imagePreview}
          aria-label="Send message"
        >
          <Send size={22} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
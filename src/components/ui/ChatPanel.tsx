import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { socket } from "@/socket";
import { ChatMessage } from "@/lib/playerUtils";

interface ChatPanelProps {
  lobbyId: string;
  playerId: string;
  className?: string;
  defaultCollapsed?: boolean;
}

export function ChatPanel({
  lobbyId,
  playerId,
  className = "",
  defaultCollapsed = false,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for incoming messages
    const handleMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on("chat:message", handleMessage);

    const handleChatHistory = (data: { messages: ChatMessage[] }) => {
      if (data.messages) {
        setMessages(data.messages);
      }
    };

    socket.on("chat:history", handleChatHistory);

    // Request history on mount (in case we missed lobby:join or are re-mounting)
    socket.emit("chat:request_history", { lobbyId });

    return () => {
      socket.off("chat:message", handleMessage);
      socket.off("chat:history", handleChatHistory);
    };
  }, [lobbyId]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (!isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isCollapsed]);

  const handleSend = () => {
    if (!input.trim()) return;

    // Emit message to server
    socket.emit("chat:send", {
      lobbyId,
      message: input.trim(),
      playerId,
    });

    setInput("");
  };

  return (
    <div
      className={`bg-card border border-border rounded-lg flex flex-col ${className}`}
    >
      {/* Header */}
      <div
        className="p-3 border-b border-border flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="font-mono text-sm font-bold">SECURE COMMS</span>
        </div>
        {isCollapsed ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Chat Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col h-[300px]"
          >
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground font-mono text-xs py-8 opacity-50">
                  Channel secure. No activity.
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.playerId === playerId;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        isMe ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span
                          className={`font-mono text-[10px] ${isMe ? "text-primary" : "text-accent"}`}
                        >
                          {msg.playerName || msg.playerId}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground/50">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg font-mono text-sm ${
                          isMe
                            ? "bg-primary/20 text-foreground rounded-tr-none"
                            : "bg-muted text-foreground rounded-tl-none"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Transmit message..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm
                    focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-3 py-2 bg-primary/20 border border-primary/50 rounded-lg
                    hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

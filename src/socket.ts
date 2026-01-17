import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://127.0.0.1:5000";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

// Debug: Log socket events
socket.on("connect", () => {
  console.log("[Socket] Connected:", socket.id);
  // Optionally, emit a ping event to backend
  socket.emit("ping", { time: Date.now() });
});

socket.on("disconnect", (reason) => {
  console.log("[Socket] Disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("[Socket] Connection error:", error);
});

socket.on("pong", (data) => {
  console.log("[Socket] Pong received from backend:", data);
});

socket.on("debug", (msg) => {
  console.log("[Socket] Debug:", msg);
});

// Lobby events
socket.on("lobby:state", (data) => {
  console.log("[Socket] Lobby state updated:", data);
});

socket.on("error", (data) => {
  console.error("[Socket] Error:", data);
});

// Game events (for future use)
socket.on("game:started", (data) => {
  console.log("[Socket] Game started:", data);
});

socket.on("game:ended", (data) => {
  console.log("[Socket] Game ended:", data);
});

// Actually connect the socket
socket.connect();

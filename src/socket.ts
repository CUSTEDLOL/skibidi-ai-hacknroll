import { io } from "socket.io-client";

export const socket = io("http://127.0.0.1:5000", {
  autoConnect: false,
  transports: ["websocket"],
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

socket.on("pong", (data) => {
  console.log("[Socket] Pong received from backend:", data);
});

// Optionally, listen for custom debug events
socket.on("debug", (msg) => {
  console.log("[Socket] Debug:", msg);
});

// Actually connect the socket
socket.connect();

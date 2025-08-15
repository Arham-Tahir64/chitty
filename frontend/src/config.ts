// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

// WebSocket URL (converts HTTP/HTTPS to WS/WSS)
export const WS_BASE_URL = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

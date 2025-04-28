module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: process.env.VUE_APP_BACKEND_URL,  //  Flask backend
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VUE_APP_BACKEND_URL,  //  WebSocket server
        changeOrigin: true,
        ws: true,  // Enable WebSocket proxy
      }
    },
  },
};
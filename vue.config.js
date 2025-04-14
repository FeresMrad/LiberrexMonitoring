// module.exports = {
//   devServer: {
//     proxy: {
//       '/api': {
//         target: 'http://82.165.230.7:9428',
//         changeOrigin: true,
//         pathRewrite: { '^/api': '' },
//       },
//     },
//   },
// };

module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: process.env.BACKEND_API_URL,  //  Flask backend
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.BACKEND_API_URL,  //  WebSocket server
        changeOrigin: true,
        ws: true,  // Enable WebSocket proxy
      }
    },
  },
};
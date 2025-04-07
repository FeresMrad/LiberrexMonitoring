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
        target: 'http://82.165.230.7:5000',  //  Flask backend
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://82.165.230.7:5000',  //  WebSocket server
        changeOrigin: true,
        ws: true,  // Enable WebSocket proxy
      }
    },
  },
};
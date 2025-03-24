module.exports = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://82.165.230.7:9428',
        changeOrigin: true,
        pathRewrite: { '^/api': '' },
      },
    },
  },
};

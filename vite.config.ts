import vue from '@vitejs/plugin-vue';
import { defineConfig, normalizePath } from 'vite';
import cesium from 'vite-plugin-cesium';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // 配置Cesium的访问
      cesium: path.resolve(__dirname, 'node_modules/cesium/Source/Cesium')
    }
  },
  server: {
    proxy: {
      '/tiles': {
        target: 'http://ecn.t2.tiles.virtualearth.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tiles/, '')
      },
      '/tiles-t1': {
        target: 'http://ecn.t1.tiles.virtualearth.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tiles/, '')
      },
      '/tiles-t2': {
        target: 'http://ecn.t3.tiles.virtualearth.net/tiles',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/tiles/, ''),
      },
    }
  },
  plugins: [
    vue(),
    cesium(),
    // 运行和构建时copy
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(path.resolve(__dirname, './node_modules/earthsdk3-assets')),
          dest: './js'
        }
      ]
    })
  ]
});
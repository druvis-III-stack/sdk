<template>
  <div>
    <div id="cesiumContainer" ref="cesiumContainer" class="cesium-viewer"></div>
    <div v-if="loading">Loading Cesium...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ESObjectsManager } from 'earthsdk3';
import { onMounted, ref} from 'vue';
import * as Cesium from 'cesium';

const loading = ref(true);
const error = ref<string | null>(null);
let viewer: Cesium.Viewer | null = null;
let tileset: Cesium.Cesium3DTileset | null = null;

// Cesium ion 配置
const ION_TOKEN = import.meta.env.VITE_VUE_APP_CESIUM_ION_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YTI5ODRmYi1mZWMyLTRmZTUtYTgxNi04NTlkNDM5MjZmNDAiLCJpZCI6Mjg3MzI2LCJpYXQiOjE3NTM3OTA0MDh9.pJwV7HKuIvI_mABidxub66UpR8fyqMJjPLq-LrwxgmY";
const TERRAIN_ASSET_ID = 3582765;

Cesium.Ion.defaultAccessToken = ION_TOKEN;

// 加载地形数据
onMounted(async () => {
  try {
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(TERRAIN_ASSET_ID);

    viewer = new Cesium.Viewer('cesiumContainer', {
      terrainProvider: terrainProvider
    });

    // 加载建筑白模
    if (viewer) {
      tileset = await Cesium.Cesium3DTileset.fromIonAssetId(3595489);
      viewer.scene.primitives.add(tileset);
    } 
  // PNG 动画逻辑
    const pngUrls = [
      'http://localhost:8084/0000.png',
      'http://localhost:8085/0001.png',
      'http://localhost:8086/0002.png',
      'http://localhost:8087/0003.png',
      'http://localhost:8088/0004.png',
      'http://localhost:8089/0005.png',
      'http://localhost:8090/0006.png',
      'http://localhost:8091/0007.png',
      'http://localhost:8092/0008.png',
      'http://localhost:8093/0009.png',
      'http://localhost:8094/0010.png',
      'http://localhost:8095/0011.png',
      'http://localhost:8096/0012.png',
    ];

    const rect = Cesium.Rectangle.fromDegrees(118.81, 32.08, 119.00, 32.17);

    let currentLayer: Cesium.ImageryLayer | null = null;
    let currentIndex = 0;

    function showFrame(idx: number) {
      if (currentLayer && viewer) {
        viewer.imageryLayers.remove(currentLayer);
      }
      if (viewer) {
        currentLayer = viewer.imageryLayers.addImageryProvider(
          new Cesium.SingleTileImageryProvider({
            url: pngUrls[idx],
            rectangle: rect,
            tileWidth: 1024,  // 假设图像宽度为 1024 像素
            tileHeight: 1024   // 假设图像高度为 1024 像素
          })
        );
      }
    }

    setInterval(() => {
      showFrame(currentIndex);
      currentIndex = (currentIndex + 1) % pngUrls.length;
    }, 1000);

  } catch (err) {
    const error = err as any;
    error.value = error.message || 'Cesium 加载失败';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 600px;
  margin: 0;
  padding: 0;
}
.error {
  color: red;
  padding: 1rem;
  background: #ffebee;
}
</style>
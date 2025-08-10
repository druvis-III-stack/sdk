<template>
  <div>
    <div id="cesiumContainer" ref="cesiumContainer" class="cesium-viewer"></div>
    <div v-if="loading">Loading Cesium...</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ESObjectsManager } from 'earthsdk3';
import { onMounted, ref, onBeforeUnmount } from 'vue';
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
  } catch (err) {
    console.error('Cesium 加载失败:', err);
    error.value = 'Cesium 加载失败，请检查网络或配置';
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy();
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
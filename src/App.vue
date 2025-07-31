<template>
  <div>
    <div id="cesiumContainer" ref="cesiumContainer" class="cesium-viewer"></div>
    <div v-if="loading">Loading Cesium...</div>
    <div v-if="error" class="error">{{ error }}</div>
    <div>
      <label>洪水水位（米）：</label>
      <input type="number" v-model.number="floodHeight" @change="updateFlood" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ESObjectsManager } from 'earthsdk3';
import { onMounted, ref, onBeforeUnmount } from 'vue';
import * as Cesium from 'cesium';

const loading = ref(true);
const error = ref<string | null>(null);
const floodHeight = ref(20); // 默认水位
let viewer: Cesium.Viewer | null = null;
let floodEntity: Cesium.Entity | null = null;

// Cesium ion 配置
const ION_TOKEN = import.meta.env.VITE_VUE_APP_CESIUM_ION_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YTI5ODRmYi1mZWMyLTRmZTUtYTgxNi04NTlkNDM5MjZmNDAiLCJpZCI6Mjg3MzI2LCJpYXQiOjE3NTM3OTA0MDh9.pJwV7HKuIvI_mABidxub66UpR8fyqMJjPLq-LrwxgmY";
const TERRAIN_ASSET_ID = 3582765;

Cesium.Ion.defaultAccessToken = ION_TOKEN;

onMounted(async () => {
  try {
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(TERRAIN_ASSET_ID);

    viewer = new Cesium.Viewer('cesiumContainer', {
      terrainProvider: terrainProvider
    });

    addFlood();

    loading.value = false;
  } catch (err) {
    console.error('Failed to initialize terrain:', err);
    error.value = 'Failed to load terrain.';
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (viewer) {
    viewer.destroy();
  }
});

function addFlood() {
  if (!viewer) return;

  const rectangle = Cesium.Rectangle.fromDegrees(
    118.81,
    32.081,
    119.0,
    32.17
  );

  // 使用 MaterialProperty 兼容方式创建水体材质
  const waterMaterial = new Cesium.ImageMaterialProperty({
    image: Cesium.buildModuleUrl('Assets/Textures/waterNormals.jpg'),
    color: new Cesium.Color(0.0, 0.3, 0.6, 0.5)
  });

  floodEntity = viewer.entities.add({
    name: "Flood Water",
    rectangle: {
      coordinates: rectangle,
      material: waterMaterial,
      height: floodHeight.value,
      extrudedHeight: floodHeight.value + 0.1
    }
  });

  viewer.camera.flyTo({
    destination: rectangle
  });
}

function updateFlood() {
  if (floodEntity && floodEntity.rectangle) {
    floodEntity.rectangle.height = new Cesium.ConstantProperty(floodHeight.value);
    floodEntity.rectangle.extrudedHeight = new Cesium.ConstantProperty(floodHeight.value + 0.1);
  }
}
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
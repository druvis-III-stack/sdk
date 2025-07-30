<template>
  <div>
    <div id="cesiumContainer" ref="cesiumContainer" class="cesium-viewer"></div>
    <div v-if="loading">Loading Cesium...</div>
    <div v-if="error" class="error">{{ error }}</div>
    <div>
      <input type="text" ref="startHeightRef" placeholder="请输入起始水位高度" /><br />
      <input type="text" ref="stopHeightRef" placeholder="请输入终止水位高度" /><br />
      <input type="text" ref="speedRef" placeholder="请输入水位增长速度" /><br />
      <button @click="draw">绘制淹没区域</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ESObjectsManager } from 'earthsdk3';
import Container from './components/Container.vue';
import { onMounted, ref, onBeforeUnmount } from 'vue';
import * as Cesium from 'cesium';

const loading = ref(true);
const error = ref<string | null>(null);
const props = withDefaults(defineProps<{ objm: ESObjectsManager }>(), {});

let viewer: any = null;
let handler: any = null;
let addRegion: any = null;
let positions: Cesium.Cartesian3[] = [];
let height: number = 0;
let maxHeight: number = 0;
let speed: number = 0;

// 输入框引用
const startHeightRef = ref<HTMLInputElement | null>(null);
const stopHeightRef = ref<HTMLInputElement | null>(null);
const speedRef = ref<HTMLInputElement | null>(null);

// Cesium ion 配置
const ION_TOKEN = import.meta.env.VITE_VUE_APP_CESIUM_ION_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YTI5ODRmYi1mZWMyLTRmZTUtYTgxNi04NTlkNDM5MjZmNDAiLCJpZCI6Mjg3MzI2LCJpYXQiOjE3NTM3OTA0MDh9.pJwV7HKuIvI_mABidxub66UpR8fyqMJjPLq-LrwxgmY";
const TERRAIN_ASSET_ID = 3582765;

Cesium.Ion.defaultAccessToken = ION_TOKEN;

let view: Cesium.Viewer | null = null;

onMounted(async () => {
  try {
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(TERRAIN_ASSET_ID);
    
    view = new Cesium.Viewer('cesiumContainer', {
      terrainProvider: terrainProvider
    });

    // 确保 view 被正确初始化后再设置 terrain
    if (view) {
      view.scene.terrainProvider = terrainProvider;
    }

    loading.value = false;
  } catch (err) {
    console.error('Failed to initialize terrain:', err);
    error.value = 'Failed to load terrain.';
    loading.value = false;
  }
});

function updateHeight(): number {
  if (height < maxHeight) height += speed;
  return height;
}

function addPolygon(hierarchy: Cesium.Cartesian3[]) {
  if (addRegion && view) {
    view.entities.remove(addRegion);
  }

  addRegion = viewer.entities.add({
    id: 'polygon',
    name: '矩形',
    show: true,
    polygon: {
      hierarchy: hierarchy,
      material: new Cesium.ImageMaterialProperty({
        image: './RasterImage/图片/河流纹理.png',
        repeat: new Cesium.Cartesian2(1.0, 1.0),
        transparent: true,
        color: Cesium.Color.WHITE.withAlpha(0.2),
      }),
      height: new Cesium.CallbackProperty(updateHeight, false),
    },
  });

  if (handler) {
    handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }
}

function draw() {
  const startInput = startHeightRef.value;
  const stopInput = stopHeightRef.value;
  const speedInput = speedRef.value;

  if (!startInput || !stopInput || !speedInput) return;

  const start = parseFloat(startInput.value);
  const stop = parseFloat(stopInput.value);
  const spd = parseFloat(speedInput.value);

  if (isNaN(start) || isNaN(stop) || isNaN(spd)) {
    alert("请输入有效的数值！");
    return;
  }

  height = start;
  maxHeight = stop;
  speed = spd;

 // 确保 viewer 已被正确初始化
  if (viewer) {
    viewer.entities.removeAll(); // 清除所有实体
    positions = [];

    if (handler) handler.destroy();
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction(function (event: any) {
      const earthPosition = viewer.scene.pickPosition(event.position);
      if (earthPosition) {
        positions.push(earthPosition);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(function () {
      if (positions.length > 0) {
        addPolygon(positions);
        positions = [];
      }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  } else {
    console.error('Viewer is not initialized');
  }
}

onBeforeUnmount(() => {
  if (handler) handler.destroy();
});

function setObjmJsonConfig() {
  throw new Error('Function not implemented.');
}
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}
.error {
  color: red;
  padding: 1rem;
  background: #ffebee;
}
</style>
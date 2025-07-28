<template>
  <div id="cesiumContainer"></div>
  <div class="toolbar">
    <input type="text" id="startHeight" placeholder="请输入起始水位高度" /><br />
    <input type="text" id="stopHeight" placeholder="请输入终止水位高度" /><br />
    <input type="text" id="speed" placeholder="请输入水位增长速度" /><br />
    <button @click="draw">绘制淹没区域</button>
  </div>
</template>

<script setup lang="ts">
import { ESObjectsManager } from 'earthsdk3';
import Container from './components/Container.vue';
import { onMounted, ref, onBeforeUnmount } from 'vue';
import * as Cesium from 'cesium';

const props = withDefaults(defineProps<{ objm: ESObjectsManager }>(), {});
const container = ref<HTMLDivElement>();

let viewer: any = null;
let handler: any = null;
let addRegion: any = null;
let positions: Cesium.Cartesian3[] = [];
let height: number = 0;
let maxHeight: number = 0;
let speed: number = 0;

onMounted(() => {
  const dom = document.getElementById('cesiumContainer') as HTMLDivElement;
  if (!dom || !props.objm) return;

  try {
    viewer = props.objm.createCesiumViewer({
      type: 'ESCesiumViewer',
      container: dom,
    });
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(114.38564, 30.52914, 2000),
    });
  } catch (error) {
    console.error('创建 Cesium Viewer 出错:', error);
  }

  setObjmJsonConfig();
});

function setObjmJsonConfig() {
  if (!props.objm) return;

  props.objm.json = {
   "asset": {
    "type": "ESObjectsManager",
    "version": "0.1.0",
    "createdTime": "2022-06-17T05:54:41.744Z",
    "modifiedTime": "2025-07-28T15:06:54.900Z",
    "name": "图层管理"
},
"viewers": [
    {
        "id": "earthui-active-viewer-id",
        "type": "ESCesiumViewer",
        "name": "ESCesiumViewer_r-id",
        "currentTime": 1753675200000,
        "simulationTime": 1753632000000
    }
],
"sceneTree": {
    "root": {
        "children": [
            {
                "name": "新建地形服务",
                "sceneObj": {
                    "id": "3f96430d-5dfc-4e92-bc01-985c30dd693b",
                    "type": "ESTerrainLayer",
                    "name": "新建地形服务",
                    "allowPicking": true,
                    "url": {
                        "url": "http://localhost:9004/tile/terrain/PIAHlT2B/layer.json",
                        "headers": {
                            "labtoken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiItMSxUaHUgQXByIDE4IDE1OjMwOjU3IENTVCAyMDI0In0.j_YKsCRsIQtpgOWfFvMwAP65Rlx9uXyVte_xkE95Vdo"
                        }
                    },
                    "rectangle": [
                        117.9997730255127,
                        31.99965476989746,
                        120.00014305114746,
                        33.00009727478027
                    ]
                },
                "children": []
            },
            {
                "name": "全球影像",
                "sceneObj": {
                    "id": "6eccdc7a-21b0-43cf-bbbc-f46e1dfbe617",
                    "type": "ESImageryLayer",
                    "name": "全球影像",
                    "url": "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                    "maximumLevel": 18
                },
                "children": []
            }
        ]
    }
},
"viewCollection": [],
"lastView": {
    "position": [
        119.1479653107382,
        32.066372074533675,
        8760.890490735646
    ],
    "rotation": [
        12.604059230470446,
        -75.19580356464766,
        359.99428605342985
    ]
}
  };
}

function updataHeight(): number {
  if (height < maxHeight) height += speed;
  return height;
}

function addPolygon(hierarchy: Cesium.Cartesian3[]) {
  addRegion = {
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
      height: new Cesium.CallbackProperty(updataHeight, false),
    },
  };
  viewer.entities.add(addRegion);
  handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
  handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

function draw() {
  const startInput = document.getElementById('startHeight') as HTMLInputElement | null;
  const stopInput = document.getElementById('stopHeight') as HTMLInputElement | null;
  const speedInput = document.getElementById('speed') as HTMLInputElement | null;

  if (!startInput || !stopInput || !speedInput) return;

  height = parseFloat(startInput.value) || 0;
  maxHeight = parseFloat(stopInput.value) || 0;
  speed = parseFloat(speedInput.value) || 0;

  viewer.entities.remove(addRegion);
  positions = [];

  handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

  handler.setInputAction(function (event: any) {
    const earthPosition = viewer.scene.pickPosition(event.position);
    positions.push(earthPosition);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  handler.setInputAction(function () {
    addPolygon(positions);
    positions = [];
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

onBeforeUnmount(() => {
  if (handler) handler.destroy();
});
</script>

<style scoped>
html,
body,
#cesiumContainer {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.toolbar {
  position: absolute;
  top: 10px;
  left: 20px;
  background-color: rgba(0, 0, 0, 0);
}

.toolbar input {
  width: 140px;
  height: 23px;
}
</style>

<template>
  <Container ref="container" />
</template>

<script setup lang="ts">
import { ESObjectsManager, ESTerrainLayer, ESImageryLayer } from 'earthsdk3';
import Container from './components/Container.vue';
import { onBeforeUnmount, provide, onMounted, ref } from 'vue';

const props = withDefaults(defineProps<{ objm: ESObjectsManager }>(), {});
provide('objm', props.objm);

const container = ref<HTMLDivElement>();

// 将 URL 提取为常量
const TERRAIN_LAYER_URL = 'http://114.242.26.126:6003/terrain/globe/layer.json';

onMounted(() => {
  const dom = container.value;
  if (!dom) return;

  if (!props.objm) {
    console.warn('objm 未传入，无法创建 Cesium Viewer');
    return;
  }

  try {
    // 创建一个 cesium 视口，并绑定 div 容器
    const czmViewer = props.objm.createCesiumViewer(dom);
    // 可选：保存 czmViewer 实例用于后续操作
  } catch (error) {
    console.error('创建 Cesium Viewer 出错:', error);
    // 可选：上报错误日志
  }

  // 设置 objm.json 配置
  setObjmJsonConfig();
});

function setObjmJsonConfig() {
  if (!props.objm) return;

  props.objm.json = {
    /**
     * 地形服务配置11111111
     */
    "asset": {
        "type": "ESObjectsManager",
        "version": "0.1.0",
        "createdTime": "2022-06-17T05:54:41.744Z",
        "modifiedTime": "2025-07-24T08:26:50.288Z",
        "name": "图层管理"
    },
    "viewers": [
        {
            "id": "earthui-active-viewer-id",
            "type": "ESCesiumViewer",
            "name": "ESCesiumViewer_r-id",
            "currentTime": 1753329600000,
            "simulationTime": 1753286400000
        }
    ],
    "sceneTree": {
        "root": {
            "children": [
                {
                    "name": "新建地形服务",
                    "sceneObj": {
                        "id": "eaf7e2d2-cdf1-401a-a0d1-3b4673cfd48a",
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
                        "id": "c2740cd6-6f9a-4b78-bd94-aed7d590059f",
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
            119.21860390154798,
            32.095367052885194,
            8856.920373941019
        ],
        "rotation": [
            342.7431632877445,
            -81.19875884174951,
            0.062848987451149
        ]
    }
  }
}
</script>

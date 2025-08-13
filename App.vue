<template>
  <div> <!-- 单一的根元素 -->
    <div id="cesiumContainer" ref="cesiumContainer" class="cesium-viewer"></div>
    <div v-if="loading">Loading Cesium...</div>
    <div v-if="error" class="error">{{ error }}</div>
    <button @click="startDrawing" :disabled="isDraw">绘制淹没区域</button>
    <div v-if="minWaterHeight !== null && maxWaterHeight !== null">
      <p>最小高程: {{ minWaterHeight }} 米</p>
      <p>最大高程: {{ maxWaterHeight }} 米</p>
      <div>
        <label>当前水位: {{ waterHeight }} 米</label>
        <input 
          type="range" 
          :min="minWaterHeight" 
          :max="maxWaterHeight" 
          v-model.number="waterHeight"
        />
      </div>
      <div>
        <button @click="startWaterLevelDecrease" :disabled="isDecreasing">开始水位下降</button>
        <button @click="stopWaterLevelDecrease" :disabled="!isDecreasing">停止水位下降</button>
        <div>
          <label>下降速度: {{ decreaseSpeed }} 米/秒</label>
          <input 
            type="range" 
            min="0.1" 
            max="5" 
            step="0.1"
            v-model.number="decreaseSpeed"
          />
        </div>
      </div>
    </div>
    <div>
      <!-- 其他内容 -->
    </div>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref, onUnmounted, watch } from 'vue';
  import * as Cesium from 'cesium';
  import * as turf from '@turf/turf';
  import type { LineString } from 'geojson';
  import type { Feature } from 'geojson';
  import type { Position } from 'geojson';
  import length from '@turf/length';
  import floodImage from '../flood.jpeg';

  const loading = ref(true);
  const error = ref<string | null>(null);
  let viewer: Cesium.Viewer | null = null;
  let tileset: Cesium.Cesium3DTileset | null = null;

  // 响应式数据
  const isDraw = ref(false);
  const maxWaterHeight = ref<number | null>(null);
  const minWaterHeight = ref<number | null>(null);
  const waterHeight = ref(0);
  const waterPrimitive = ref<Cesium.Primitive | undefined>(undefined);
  const isDecreasing = ref(false);
  const decreaseSpeed = ref(1); // 水位下降速度 (米/秒)
  let decreaseInterval: number | null = null;


  // 绘制相关变量
  let activeShapePoints: Cesium.Cartesian3[] = [];
  let floatingPoint: Cesium.Entity | undefined = undefined;
  let activeShape: Cesium.Entity | undefined = undefined;
  let handler: Cesium.ScreenSpaceEventHandler | undefined = undefined;
  let tempEntities: Cesium.Entity[] = [];

  // Cesium ion 配置
  const ION_TOKEN = import.meta.env.VITE_VUE_APP_CESIUM_ION_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YTI5ODRmYi1mZWMyLTRmZTUtYTgxNi04NTlkNDM5MjZmNDAiLCJpZCI6Mjg3MzI2LCJpYXQiOjE3NTM3OTA0MDh9.pJwV7HKuIvI_mABidxub66UpR8fyqMJjPLq-LrwxgmY";
  const TERRAIN_ASSET_ID = 3582765;

  Cesium.Ion.defaultAccessToken = ION_TOKEN;

  onMounted(async () => {
    try {
      const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(TERRAIN_ASSET_ID);
      viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: terrainProvider,
        animation: false,
        homeButton: false,
        geocoder: false,
        baseLayerPicker: true,
        timeline: true,
        fullscreenButton: false,
        scene3DOnly: true,
        infoBox: false,
        sceneModePicker: false,
        navigationInstructionsInitiallyVisible: false,
        navigationHelpButton: false,
        selectionIndicator: false,
        shouldAnimate: true,
        contextOptions: {
          webgl: {
            alpha: true,
            depth: true,
            stencil: true,
            antialias: true,
            premultipliedAlpha: true,
            preserveDrawingBuffer: true,
            failIfMajorPerformanceCaveat: true
          },
          allowTextureFilterAnisotropic: true
        },
      });

      if (viewer) {
        (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = "none";
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#000d2d');
        viewer.scene.globe.enableLighting = false;
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.postProcessStages.fxaa.enabled = false;
        viewer.scene.fog.enabled = false;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.debugShowFramesPerSecond = false;

        tileset = await Cesium.Cesium3DTileset.fromIonAssetId(3595489);
        viewer.scene.primitives.add(tileset);
      }
    } catch (err: any) {
      error.value = err.message || 'Cesium 加载失败';
    } finally {
      loading.value = false;
    }
  });

  const startDrawing = () => {
    activeShapePoints = [];
    floatingPoint = undefined;
    activeShape = undefined;
    tempEntities = [];
    
    if (!viewer) return;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    
    handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const earthPosition = viewer!.scene.pickPosition(event.position);
      if (Cesium.defined(earthPosition)) {
        if (activeShapePoints.length === 0) {
          floatingPoint = createPoint(earthPosition);
          activeShapePoints.push(earthPosition);
          const dynamicPositions = new Cesium.CallbackProperty(() => {
            return new Cesium.PolygonHierarchy(activeShapePoints);
          }, false);
          if (!viewer) return;
          activeShape = viewer.entities.add({
            polygon: {
              hierarchy: dynamicPositions,
              material: Cesium.Color.fromBytes(64, 157, 253, 50),
              outline: true,
              outlineColor: Cesium.Color.SKYBLUE,
              outlineWidth: 4,
            }
          });
        }
        activeShapePoints.push(earthPosition);
        tempEntities.push(createPoint(earthPosition));
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    
    handler.setInputAction((event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      if (Cesium.defined(floatingPoint)) {
        const newPosition = viewer!.scene.pickPosition(event.endPosition);
        if (Cesium.defined(newPosition)) {
          (floatingPoint.position as Cesium.ConstantPositionProperty).setValue(newPosition);
          activeShapePoints.pop();
          activeShapePoints.push(newPosition);
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    
    handler.setInputAction(() => {
    activeShapePoints.pop();
    if (activeShapePoints.length < 3) return;

    tempEntities.push(drawPolyline(activeShapePoints)!);
    const polygon = drawShape(activeShapePoints, Cesium.Color.fromBytes(64, 157, 253, 20));
    tempEntities.push(polygon);

    viewer!.entities.remove(floatingPoint!);
    viewer!.entities.remove(activeShape!);
    floatingPoint = undefined;
    activeShape = undefined;

    handler?.destroy();
    handler = undefined;

    // 确保 activeShapePoints 至少包含两个点
    if (activeShapePoints.length >= 2) {
      inundationAnalysis();
    }
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    
    isDraw.value = true;
  };

  const createPoint = (worldPosition: Cesium.Cartesian3) => {
    if (!viewer) throw new Error("Viewer not initialized");
    return viewer.entities.add({
      position: worldPosition,
      point: {
        color: Cesium.Color.SKYBLUE,
        pixelSize: 5,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  };

  const drawShape = (positionData: Cesium.PolygonHierarchy | Cesium.Cartesian3[], material: Cesium.Color) => {
    if (!viewer) throw new Error("Viewer not initialized");
    return viewer.entities.add({
      polygon: {
        hierarchy: positionData,
        material: material,
        outline: true,
        outlineColor: Cesium.Color.SKYBLUE,
        outlineWidth: 4,
      }
    });
  };

  const drawPolyline = (positions: Cesium.Cartesian3[]) => {
    if (positions.length < 1 || !viewer) return;
    const startP = positions[0];
    const endP = positions[positions.length - 1];
    const closedPositions = [...positions];
    
    if (startP.x !== endP.x || startP.y !== endP.y || startP.z !== endP.z) {
      closedPositions.push(positions[0]);
    }

    return viewer.entities.add({
      name: 'polyline',
      polyline: {
        positions: closedPositions,
        width: 2.0,
        material: Cesium.Color.SKYBLUE,
        clampToGround: false,
      }
    });
  };

  const getAreaHeight = async (positions: Cesium.Cartesian3[]) => {
    if (!Array.isArray(positions) || positions.length < 2) {
      throw new Error('Positions must be an array of two or more positions');
    }
    if (!viewer) throw new Error("Viewer not initialized");
    let closedPositions = [...positions];
    const startP = positions[0];
    const endP = positions[positions.length - 1];

    if (startP.x !== endP.x || startP.y !== endP.y || startP.z !== endP.z) {
      closedPositions.push(positions[0]);
    }

    const tempPoints: [number, number][] = [];
    for (let i = 0; i < closedPositions.length; i++) {
      const ellipsoid = viewer.scene.globe.ellipsoid;
      const cartographic = ellipsoid.cartesianToCartographic(closedPositions[i]);

      // 添加检查，确保转换成功
      if (cartographic) {
        const lat = Cesium.Math.toDegrees(cartographic.latitude);
        const lng = Cesium.Math.toDegrees(cartographic.longitude);
        tempPoints.push([lng, lat]);
      }
    }

    // 添加检查，确保 tempPoints 至少包含两个点
    if (tempPoints.length < 2) {
      console.warn('有效坐标点不足两个，跳过淹没分析');
      return { minHeight: 0, maxHeight: 0 }; // 返回默认值而不是抛出错误
    }

    const line = turf.lineString(tempPoints);
    const chunkLength = 10;
    const coords = line.geometry.coordinates;
    const chunks: Feature<LineString>[] = [];
    let currentChunk: [number, number][] = [coords[0] as [number, number]];

    for (let i = 1; i < coords.length; i++) {
      const segmentCoords = [coords[i - 1] as [number, number], coords[i] as [number, number]];
      // 添加检查确保segmentCoords至少包含两个点
      if (segmentCoords.length >= 2) {
        const segment = turf.lineString(segmentCoords);
        const segmentDistance = length(segment, { units: 'meters' });

        // 同样需要检查currentChunk的长度
        if (currentChunk.length >= 2) {  // 修改：确保至少有两个点
          const currentLine = turf.lineString(currentChunk);
          if (length(currentLine, { units: 'meters' }) + segmentDistance > chunkLength) {
            // 确保currentChunk至少有两个点再创建lineString
            if (currentChunk.length >= 2) {
              chunks.push(turf.lineString(currentChunk));
            }
            currentChunk = [coords[i - 1] as [number, number], coords[i] as [number, number]];
          } else {
            currentChunk.push(coords[i] as [number, number]);
          }
        } else if (currentChunk.length === 1) {  // 修改：当只有一个点时，直接替换为新点或添加新点
          // 检查是否需要开始新的chunk
          currentChunk.push(coords[i] as [number, number]);
        }
      }
    }

    // 最后确保currentChunk至少有两个点
    if (currentChunk.length >= 2) {
      chunks.push(turf.lineString(currentChunk));
    }

    // 如果没有生成chunks，直接返回
    if (chunks.length === 0) {
      console.warn('未能生成有效的线段chunks');
      return { minHeight: 0, maxHeight: 0 };
    }

    const tempArray: Cesium.Cartographic[] = [];
    chunks.forEach(f => {
      f.geometry.coordinates.forEach((c: Position) => {
        if (c.length >= 2) {
          tempArray.push(Cesium.Cartographic.fromDegrees(c[0], c[1]));
        }
      });
    });

    const updatedPositions = await Cesium.sampleTerrainMostDetailed(
      viewer.terrainProvider,
      tempArray
    );

    // 检查是否有有效的地形采样结果
    if (updatedPositions.length === 0) {
      console.warn('未能获取有效的地形高程数据');
      return { minHeight: 0, maxHeight: 0 };
    }

    let minHeight = Number.MAX_VALUE;
    let maxHeight = -Number.MAX_VALUE;

    for (let i = 0; i < updatedPositions.length; i++) {
      const height = updatedPositions[i].height;
      if (height < minHeight) minHeight = height;
      if (height > maxHeight) maxHeight = height;
    }

    minWaterHeight.value = Math.ceil(minHeight);
    maxWaterHeight.value = Math.ceil(maxHeight);
    waterHeight.value = minWaterHeight.value;

    isDraw.value = false;

    return {
      minHeight,
      maxHeight
    };
  };

  const inundationAnalysis = async () => {
    if (activeShapePoints.length < 2) {
      console.error('至少需要两个点来执行淹没分析');
      return;
    }
    const heights = await getAreaHeight(activeShapePoints);
    console.log('区域高程范围:', heights);
  };

  const updateWaterPrimitive = () => {
    if (!viewer) return;
    if (waterPrimitive.value) {
      viewer.scene.primitives.remove(waterPrimitive.value);
    }
    
    if (activeShapePoints.length >= 3 && minWaterHeight.value !== null) {
      const hierarchy = new Cesium.PolygonHierarchy(activeShapePoints);
      
      const waterMaterial = new Cesium.Material({
        fabric: {
          type: 'Water',
          uniforms: {
            u_normalMap: floodImage, // 使用 import 引入的路径
          }
        },
        translucent: true,
      });

      waterPrimitive.value = viewer.scene.primitives.add(new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: new Cesium.PolygonGeometry({
            polygonHierarchy: hierarchy,
            height: waterHeight.value
          })
        }),
        appearance: new Cesium.MaterialAppearance({
          material: waterMaterial
        })
      }));
    }
  };

  watch(waterHeight, () => {
    updateWaterPrimitive();
  });

  // 添加水位下降相关方法
  const startWaterLevelDecrease = () => {
    if (!minWaterHeight.value || waterHeight.value <= minWaterHeight.value || isDecreasing.value) return;
    
    isDecreasing.value = true;
    
    // 使用 setInterval 实现水位持续下降
    decreaseInterval = window.setInterval(() => {
      if (waterHeight.value > minWaterHeight.value!) {
        waterHeight.value = Math.max(
          minWaterHeight.value!, 
          waterHeight.value - decreaseSpeed.value
        );
      } else {
        stopWaterLevelDecrease();
      }
    }, 1000); // 每秒更新一次
  };

  const stopWaterLevelDecrease = () => {
    if (decreaseInterval) {
      clearInterval(decreaseInterval);
      decreaseInterval = null;
    }
    isDecreasing.value = false;
  };

  onUnmounted(() => {
    handler?.destroy();
    tempEntities.forEach(entity => {
      viewer?.entities.remove(entity);
    });
    if (waterPrimitive.value) {
      viewer?.scene.primitives.remove(waterPrimitive.value);
    }
    viewer?.destroy();
    stopWaterLevelDecrease(); // 添加停止水位下降的清理
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
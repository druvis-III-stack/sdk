import { createApp } from 'vue'
import './style.css';
import App from './App.vue'
import { ESObjectsManager } from 'earthsdk3';
import { ESUeViewer } from 'earthsdk3-ue';
import { ESCesiumViewer } from 'earthsdk3-cesium';

const objm = new ESObjectsManager(ESUeViewer, ESCesiumViewer);

//@ts-ignore
window.g_objm = objm;

createApp(App, { objm }).mount('#app');

//czm和ue的图层
objm.sceneTree.createSceneObjectTreeItemFromJson({
    "id": "ae103185-08c7-4ed0-b6d4-15ad77bbbf66",
    "type": "ESImageryLayer",
    "url": "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "maximumLevel": 18,
    "name": "全球影像",
    "allowPicking": true
})

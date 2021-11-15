<template>
  <el-container>
    <el-aside width="50" style="height: 100%;">
      <el-menu
          default-active="1"
          class="el-menu-vertical-demo"
          background-color="#545c64"
          text-color="#fff"
          active-text-color="#ffd04b"
          @select="handleSelect"
      >
        <el-menu-item index="1" @dblclick.prevent>
          <i class="el-icon-s-opportunity"></i>
        </el-menu-item>
        <el-menu-item index="2" @dblclick.prevent>
          <i class="el-icon-s-data"></i>
        </el-menu-item>
        <el-menu-item index="3" @dblclick.prevent>
          <i class="el-icon-error"></i>
        </el-menu-item>
        <el-menu-item index="4" @dblclick.prevent>
          <i class="el-icon-setting"></i>
        </el-menu-item>
        <el-menu-item index="5" @dblclick.prevent>
          <i class="el-icon-pie-chart"></i>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main>
      <div id="container" style="height: 100%;"></div>
      <div>
        <el-card style="width: 300px" class="label">
          <div v-for="(info,index) in dataInfo" :key="index">
            <span>{{ info.key }}</span>
            <span style="display: inline-block; margin-left: 50px">{{ info.value }}</span>
            <el-divider/>
          </div>
          <!--          <div>
                      <span>楼栋名称</span>
                      <span style="display: inline-block; margin-left: 50px">{{ effectController.name }}</span>
                    </div>
                    <el-divider/>
                    <div>
                      <span>居住人数</span>
                      <span style="display: inline-block; margin-left: 50px">{{ effectController.num }}</span>
                    </div>
                    <el-divider/>
                    <div>
                      <span>楼栋层数</span>
                      <span style="display: inline-block; margin-left: 50px">{{ effectController.layerNum }}</span>
                    </div>-->
        </el-card>
      </div>
      <div id="chart"></div>
      <div id="video"></div>
    </el-main>
  </el-container>
</template>

<script>
import * as THREE from 'three'
import Stats from '../../public/static/js/stats'
import {MTLLoader} from 'three/examples/jsm/loaders/MTLLoader'
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader'
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {threeJSComposer} from "../../public/static/js/threeJSComposer"
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer"
import {TWEEN} from "three/examples/jsm/libs/tween.module.min"
import {GUI} from 'three/examples/jsm/libs/dat.gui.module'
import {CSS2DObject, CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer";
import * as echarts from "echarts";

export default {
  name: "City",
  data() {
    return {
      depInfos: [],
      labelArray: [],
      selectedInfos: [],
      mixer: null,
      dataInfo: [],
      progress: 0,
      curve: null,
      truck: null,
      effectController: {
        name: '',
        num: '',
        layerNum: ''
      }
    }
  },
  mounted() {
    this.effectComposer = null
    this.clock = new THREE.Clock()
    this.scene = null
    this.camera = null
    this.renderer = null
    this.css2dRender = null
    this.controls = null
    this.stats = null
    this.cubeMap = null
    this.container = document.querySelector('#container')
    this.init()// this.labelArray = this.getLabel()
  },
  beforeDestroy() {
    this.scene = null
    this.camera = null
    this.css2dRender = null
    this.renderer = null
    this.controls = null
    this.stats = null
    this.cubeMap = null
  },
  methods: {
    init() {
      this.initScene()
      this.initCamera()
      this.initLight()
      this.initStats()
      this.initRenderer()
      this.initControls()
      this.render()
      this.initGUI()
      this.initModel('city').then(obj => {
        this.initTrail(obj)
        this.animate()
      })
      this.addSkybox()
      // this.addLabel()
      window.addEventListener('resize', this.onWindowResize)
    },
    // 初始化场景
    initScene() {
      this.scene = new THREE.Scene()
      // this.scene.fog = new THREE.Fog(this.scene.background, 3000, 5000)
    },
    // 初始化相机
    initCamera() {
      this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 10, 10000)
      this.camera.position.set(1500, 1500, 1500)
      this.camera.lookAt(new THREE.Vector3(0, 0, 0))
    },
    // 初始化灯光
    initLight() {
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3)// 平行光
      directionalLight.color.setHSL(0.1, 1, 0.95)
      directionalLight.position.set(0, 2000, 0).normalize()
      this.scene.add(directionalLight)
      const ambient = new THREE.AmbientLight(0xffffff, 1) // 环境光
      ambient.position.set(0, 0, 0)
      this.scene.add(ambient)
    },
    // 初始化性能插件
    initStats() {
      this.stats = new Stats()
      this.stats.domElement.style.position = 'absolute'
      this.stats.domElement.style.left = '70px'
      this.stats.domElement.style.top = '0px'
      document.body.appendChild(this.stats.domElement)
      return this.stats
    },
    // 初始化轨迹球控件
    initControls() {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      // 如果使用animate方法时，将此函数删除
      // this.controls.addEventListener( 'change', this.render() )
      // 使动画循环使用时阻尼或自转 意思是否有惯性
      this.controls.enableDamping = true
      //动态阻尼系数 就是鼠标拖拽旋转灵敏度
      //controls.dampingFactor = 0.25
      //是否可以缩放
      this.controls.enableZoom = true
      //是否自动旋转
      this.controls.autoRotate = false
      this.controls.autoRotateSpeed = 0.5
      //设置相机距离原点的最近距离
      this.controls.minDistance = 100
      //设置相机距离原点的最远距离
      this.controls.maxDistance = 5000
      //是否开启右键拖拽
      this.controls.enablePan = true
      // 最大角度
      this.controls.maxPolarAngle = Math.PI / 2.2
    },
    // 更新控件
    update() {
      this.stats.update()
      this.controls.update()
    },
    // 初始化渲染器
    initRenderer() {
      this.css2dRender = new CSS2DRenderer()
      this.css2dRender.setSize(this.container.clientWidth, this.container.clientHeight)
      this.css2dRender.domElement.style.position = 'absolute'
      // 相对鼠标的相对偏移
      this.css2dRender.domElement.style.top = '0'
      this.css2dRender.domElement.className = 'css2dRender'
      this.css2dRender.domElement.style.left = '70px'
      // 设置.pointerEvents=none，以免模型标签HTML元素遮挡鼠标选择场景模型
      this.css2dRender.domElement.style.pointerEvents = 'none';
      this.container.appendChild(this.css2dRender.domElement)
      // 抗锯齿
      this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true})
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.setClearColor(0xafcccc, 1.0)
      this.container.appendChild(this.renderer.domElement)
    },
    // 渲染
    render() {
      // 使用加减法可以设置不同的运动方向

      /* if (this.progress > 1.0) {
         return;    //停留在管道末端,否则会一直跑到起点 循环再跑
       }*/
      this.progress += 0.0009;
      if (this.curve) {
        let point = this.curve.getPoint(this.progress);
        let point1 = this.curve.getPoint(this.progress + 0.001);
        if (point && point.x) {
          this.truck.position.set(point.x, point.y, point.z);
          this.truck.lookAt(point1.x, point1.y, point1.z);
        }
      }
    },
    // 放置天空盒
    addSkybox() {
      const urls = [
        require('../../public/static/images/skybox/dark-s_px.jpg'), // right
        require('../../public/static/images/skybox/dark-s_nx.jpg'), // left
        require('../../public/static/images/skybox/dark-s_py.jpg'), // top
        require('../../public/static/images/skybox/dark-s_ny.jpg'), // bottom
        require('../../public/static/images/skybox/dark-s_pz.jpg'), // back
        require('../../public/static/images/skybox/dark-s_nz.jpg')  // front
      ]
      this.cubeMap = new THREE.CubeTextureLoader().load(urls)
      this.scene.background = this.cubeMap
      /*const equirectShader = THREE.ShaderLib['equirect']
      const equirectMaterial = new THREE.ShaderMaterial({
        fragmentShader: equirectShader.fragmentShader,
        vertexShader: equirectShader.vertexShader,
        uniforms: equirectShader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
      })
      equirectMaterial.uniforms['tEquirect'].value = this.cubeMap

      const skyBox = new THREE.Mesh(new THREE.BoxGeometry(10000, 10000, 10000), equirectMaterial)

      this.scene.add(skyBox)*/
    },
    // 初始化模型
    initModel(url) {
      return new Promise((resolve, reject) => {
        const axes = new THREE.AxesHelper(5000)
        this.scene.add(axes)
        const helper = new THREE.GridHelper(10000, 2, 0xffffff, 0xffffff);
        this.scene.add(helper);
        new MTLLoader()
            .setPath('/static/obj/')
            .load(`${url}.mtl`, materials => {

              materials.preload();

              new OBJLoader()
                  .setMaterials(materials)
                  .setPath('/static/obj/')
                  .load(`${url}.obj`, obj => {
                    if (obj) {
                      // console.log(obj)
                      obj.children.forEach(child => {
                        child.material.envmap = this.cubeMap
                        child.geometry.computeBoundingBox()
                        const centroid = new THREE.Vector3()
                        centroid.addVectors(child.geometry.boundingBox.min, child.geometry.boundingBox.max)
                        centroid.multiplyScalar(0.5)
                        centroid.applyMatrix4(child.matrixWorld)
                        child.geometry.center(centroid.x, centroid.y, centroid.z)
                        child.position.set(centroid.x, centroid.y, centroid.z)
                      })
                      // obj.scale.set(20,20,20)
                      // obj.translateY(-100)
                      this.scene.add(obj)
                      this.effectComposer = new EffectComposer(this.renderer)
                      threeJSComposer(this)
                      resolve(obj)
                    } else {
                      reject('load error')
                    }
                  })
            })
      })
    },
    initTrail(obj) {
      this.curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(500, 20, -1200),
        new THREE.Vector3(500, 20, -800),
        new THREE.Vector3(500, 20, -600),
        new THREE.Vector3(500, 20, 400),
        new THREE.Vector3(-400, 20, 400),
        new THREE.Vector3(-400, 20, -600),
        new THREE.Vector3(-400, 20, -1300)
      ], true)
      // 初始化曲线的顶点(放样点，数值越大弯曲更光滑)
      const vertices = this.curve.getPoints(100)
      const geometry = new THREE.BufferGeometry().setFromPoints(vertices)
      let material = new THREE.LineBasicMaterial({transparent: this, opacity: 0})
      let curveObject = new THREE.Line(geometry, material)
      this.scene.add(curveObject)
      this.truck = obj.getObjectByName('truck4')
      // 声明一个数组用于存储时间序列
      /* let arr = []
       for (let i = 0; i < 101; i++) {
         arr.push(i)
       }
       // 生成一个时间序列
       const times = new Float32Array(arr);

       const posArr = []
       vertices.forEach(elem => {
         posArr.push(elem.x, elem.y, elem.z)
       });
       // 创建一个和时间序列相对应的位置坐标系列
       const values = new Float32Array(posArr);
       // 创建一个帧动画的关键帧数据，曲线上的位置序列对应一个时间序列
       const posTrack = new THREE.KeyframeTrack('.position', times, values);
       const duration = 101;
       const clip = new THREE.AnimationClip("default", duration, [posTrack]);
         this.mixer = new THREE.AnimationMixer(obj.getObjectByName('truck4'));
         const AnimationAction = this.mixer.clipAction(clip);
         AnimationAction.timeScale = 20;
         AnimationAction.play();*/
    },
    // 初始化GUI
    initGUI() {
      const gui = new GUI()
      gui.domElement.classList.add()
      gui.domElement.style.cssText = 'position:absolute;top:0;right:0;display:none'
      gui.add(this.effectController, 'name').name("楼栋名称：").listen()
      gui.add(this.effectController, 'num').name("居住人数：").listen()
      gui.add(this.effectController, 'layerNum').name("楼栋层数：").listen()
    },
    // 窗口尺寸变化处理函数
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
      this.css2dRender.setSize(this.container.clientWidth, this.container.clientHeight)
    },
    // 动画
    animate() {
      const delta = this.clock.getDelta()
      // 循环渲染
      this.render()
      this.update()
      this.css2dRender.render(this.scene, this.camera)
      // 刷新动画
      TWEEN.update()
      this.effectComposer.render(delta)
      // 更新帧动画的时间
      // this.mixer.update(delta);
      // 请求动画帧
      requestAnimationFrame(this.animate)
    },
    addLabel() {
      // 防止重复添加标签
      /*for (const ele of this.labelArray) {
        const label = this.scene.getObjectByName(ele)
        if (label) return
      }*/
      this.depInfos = this.scene.children[4].children.filter(ele => ele.name.startsWith('car'))
      this.depInfos.forEach(ele => {
        const label = this.createTag(ele)
        ele.add(label)
      })
    },
    delLabel() {
      for (const child of this.scene.children) {
        if (child.type === 'Sprite') {
          this.scene.remove(child)
        }
      }
      for (const ele of this.labelArray) {
        const label = this.scene.getObjectByName(ele)
        if (label) {
          label.parent.remove(label)
        }
      }
    },
    // 创建一个html标签
    createTag(ele) {
      const div = document.createElement('div');
      div.textContent = ele.name;
      // div元素包装成为css2模型对象CSS2DObject
      const label = new CSS2DObject(div);
      label.name = 'dep' + ele.name
      this.labelArray.push(label.name)
      div.className = 'css2dLabel'
      // 设置HTML元素标签在three.js世界坐标中位置
      return label;
    },
    handleSelect(index) {
      const depArr = ['dep1', 'dep2', 'dep3']
      const carArr = ['bus']
      switch (index) {
        case '1':
          this.addLabel()
          break
        case '2':
          this.initCharts()
          break
        case '3':
          this.delLabel()
          break
        case '4':
          this.addIdentification(depArr, require('../../public/static/images/down.png'))
          break
        case '5':
          this.initSceneCharts(carArr)
          break
      }
    },
    initSceneCharts(meshNames) {
      const div = document.createElement('canvas')
      div.style.cssText = 'position: absolute;left: 0;bottom: 0'
      div.style.width = '400px'
      div.style.height = '400px'
      const option = {
        tooltip: {
          trigger: 'item'
        },
        legend: {
          top: '5%',
          left: 'center'
        },
        series: [
          {
            name: 'data',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 2
            },
            label: {
              show: false,
              position: 'center'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '40',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: [
              {value: 1048, name: 'A'},
              {value: 735, name: 'B'},
              {value: 580, name: 'C'},
              {value: 484, name: 'D'},
              {value: 300, name: 'E'}
            ]
          }
        ]
      };
      for (const meshName of meshNames) {
        const _obj = this.scene.getObjectByName(meshName)
        const pieChart = echarts.init(div);
        pieChart.setOption(option);
        pieChart.on('finished', () => {
          const infoEchart = new THREE.TextureLoader().load(pieChart.getDataURL());

          const infoEchartMaterial = new THREE.MeshBasicMaterial({
            transparent: true,
            map: infoEchart,
            side: THREE.DoubleSide
          });

          const echartPlane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), infoEchartMaterial);
          echartPlane.position.set(_obj.position.x, _obj.position.y, _obj.position.z);
          echartPlane.translateY(15);
          this.scene.add(echartPlane);
        });
      }
    },
    initCharts() {
      const div = document.querySelector('#chart')
      div.style.display = div.style.display === 'block' ? 'none' : 'block'
      div.style.backgroundColor = 'rgba(25,25,25,0.5)';
      const pageChart = echarts.init(div);
      const option = {
        title: {
          text: '部门统计',
          subtext: '人员数据',
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: 'Access From',
            type: 'pie',
            radius: '50%',
            data: [
              {value: 1048, name: '生产部'},
              {value: 735, name: '系统集成部'},
              {value: 580, name: '移动电话营销部'},
              {value: 484, name: '科技发展部'},
              {value: 300, name: '物料部'}
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      };
      pageChart.setOption(option)
      this.container.appendChild(div)
    },
    //添加图片标识
    addIdentification(meshNames, imgUrl) {
      for (const meshName of meshNames) {
        const _obj = this.scene.getObjectByName(meshName)
        const spriteMaterial = new THREE.SpriteMaterial({
          map: new THREE.TextureLoader().load(imgUrl),
          transparent: true,
          color: 0xcc0000
        })
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.name = 'sprite'
        // 把精灵模型插入到模型对象的父对象下面
        // 表示标签信息的精灵模型对象相对父对象设置一定的偏移
        sprite.position.set(_obj.position.x, _obj.position.y, _obj.position.z)
        sprite.scale.set(50, 50, 50);
        sprite.translateY(_obj.position.y + 100);
        sprite.matrixWorldNeedsUpdate = true
        this.scene.add(sprite);
      }
    }
  }
}
</script>

<style scoped>
.label {
  position: absolute;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;
}

.label span{
  display: inline-block;
  width: 100px;
}
#chart {
  width: 500px;
  height: 500px;
  position: absolute;
  left: 70px;
  bottom: 0;
  display: block;
  border-radius: 10px;
}

/deep/ .el-menu {
  height: 100%;
}

.el-main {
  padding: 0;
}


/deep/ .css2dLabel {
  padding: 4px 10px;
  color: #ffbbaa;
  background-color: rgba(25, 25, 25, 0.5);
  position: absolute;
  border-radius: 5px;
  font-size: 16px;
  pointer-events: none
}

/deep/ .css2dLabel:after {
  border: 5px solid transparent;
  border-top-color: rgba(25, 25, 25, 0.5);
  content: '';
  height: 0;
  width: 0;
  position: absolute;
  top: 100%;
  left: 10px;
}

#video {
  position: absolute;
  display: none;
}
</style>

<template>
  <el-container>
    <el-aside width="200" style="height: 100%;">
      <el-menu
          default-active="0"
          class="el-menu-vertical-demo"
          background-color="#545c64"
          text-color="#fff"
          active-text-color="#ffd04b"
          @select="handleSelect"
      >
        <el-menu-item v-for="(item,index) in menuList" :index="index.toString()" :key="index">
          <i :class="item.icon"></i>
          <span slot="title">{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main>
      <div id="container" style="height: 100%;"></div>
      <div>
        <el-card style="width: 300px" class="label">
          <div v-for="(info,index) in dataInfo" :key="index">
            <span>{{ info.key }}</span>
            <span style="display: inline-block; margin-left: 50px;">{{ info.value }}</span>
            <el-divider/>
          </div>
        </el-card>
      </div>
      <div id="chart1" class="chart"></div>
      <div id="chart2" class="chart"></div>
    </el-main>
  </el-container>
</template>

<script>
import * as THREE from 'three'
import * as echarts from "echarts"
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls'
import {GUI} from 'three/examples/jsm/libs/dat.gui.module'
import {TWEEN} from "three/examples/jsm/libs/tween.module.min"
import {MTLLoader} from 'three/examples/jsm/loaders/MTLLoader'
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader'
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer"
import {CSS2DObject, CSS2DRenderer} from "three/examples/jsm/renderers/CSS2DRenderer"
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass"
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass"
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass"
import {OutlinePass} from "three/examples/jsm/postprocessing/OutlinePass"
import {CopyShader} from "three/examples/jsm/shaders/CopyShader"
import {FXAAShader} from "three/examples/jsm/shaders/FXAAShader"
import Stats from '../../public/static/js/stats'
import {mousePick} from "../../public/static/js/mousePick"
import {FlowTexture} from "../../public/static/js/flowTexture";

export default {
  name: "City",
  data() {
    return {
      menuList: [
        {label: 'CSS2D Label', icon: 'el-icon-collection-tag'},
        {label: 'ECharts Page', icon: 'el-icon-s-data'},
        {label: 'Sprite Label', icon: 'el-icon-magic-stick'},
        {label: 'ECharts Scene', icon: 'el-icon-pie-chart'},
        {label: 'First Person', icon: 'el-icon-place'},
        {label: 'Bounding Box', icon: 'el-icon-view'},
        {label: 'Init Viewport', icon: 'el-icon-loading'},
        {label: 'Snow Weather', icon: 'el-icon-light-rain'},
        {label: 'Sprite Canvas', icon: 'el-icon-postcard'}
      ],
      progress: 0,
      groupIndex: 0,
      dataInfo: [],
      cubeArray: [],
      selectedInfos: [],
      css2dLabelArray: [],
      containBoxArray: [],
      spriteLabelArray: [],
      mixer: null,
      curve: null,
      truck: null,
      effectController: {
        A: '',
        B: '',
        C: ''
      },
      loadFlag: false,
      followTruck: false,
      canvas: null,
      dynamicSprite: null,
      timer: null
    }
  },
  mounted() {
    this.animationID = 0
    this.scene = null
    this.stats = null
    this.camera = null
    this.cubeMap = null
    this.renderer = null
    this.controls = null
    this.outlinePass = null
    this.css2dRender = null
    this.effectComposer = null
    this.rollTexture = null
    this.clock = new THREE.Clock()
    this.container = document.querySelector('#container')
    this.initLoading()
    this.init()
    clearInterval(this.timer)
  },
  beforeDestroy() {
    this.scene.clear()
    this.stats = null
    this.camera = null
    this.cubeMap = null
    cancelAnimationFrame(this.animationID)
    this.renderer.forceContextLoss()
    this.renderer.dispose()
    this.renderer.content = null
    const gl = this.renderer.domElement.getContext('webgl')
    gl && gl.getExtension('WEBGL_lose_context').loseContext()
    this.controls = null
    this.css2dRender = null
    this.outlinePass = null
  },
  methods: {
    handleSelect(index) {
      const tlArr = ['trafficLight1', 'trafficLight2', 'trafficLight3']
      const depArr = ['dep1']
      const param = {
        width: 60,
        height: 40,
        text: '10M/s',
        name: 'dynamicLabel',
        x: 30,
        y: 20,
        z: 20
      }
      switch (index) {
        case '0':
          this.addCSS2DLabel()
          break
        case '1':
          this.initCharts()
          break
        case '2':
          this.addSpriteLabel(tlArr, require('../../public/static/images/video.png'))
          break
        case '3':
          this.initSceneCharts(depArr)
          break
        case '4':
          this.followTruck = true
          break
        case '5':
          this.containBox()
          break
        case '6':
          this.followTruck = false
          this.controls.position0 = new THREE.Vector3(1500, 1500, 1500)
          this.controls.reset()
          break
        case '7':
          this.snowSprite()
          break
        case '8':
          this.spriteCanvas('truck4', param)
          break
      }
    },
    init() {
      this.initScene()
      this.initCamera()
      this.initLight()
      this.initStats()
      this.initRenderer()
      this.initControls()
      this.initGUI()
      this.addSkybox()
      this.initComposer()
      this.initFlowLabel()
      this.initModel('city')
          .then(obj => {
            const loadingMask = document.querySelector('#loadingHtml')
            loadingMask.remove()
            this.initTrail(obj)
            this.render()
            this.groupIndex = this.scene.children.findIndex(item => item.type === 'Group')
          })
          .catch(error => console.error(error))
      window.addEventListener('resize', this.onWindowResize, false)
    },
    initLoading() {
      const loadingHtml = document.createElement('div')
      loadingHtml.id = 'loadingHtml'
      const loadingImage = document.createElement('div')
      loadingImage.classList.add('load')
      loadingHtml.appendChild(loadingImage)
      document.body.appendChild(loadingHtml)
    },
    initScene() {
      this.scene = new THREE.Scene()
      // this.scene.fog = new THREE.Fog(this.scene.background, 3000, 5000)
    },
    initCamera() {
      this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 10, 10000)
      this.camera.position.set(1500, 1500, 1500)
      this.camera.lookAt(new THREE.Vector3(0, 0, 0))
    },
    initLight() {
      const PointLight = new THREE.PointLight(0xffffff, 0.6)
      // directionalLight.color.setHSL(0.1, 1, 0.95)
      // directionalLight.position.set(0, 2000, 0).normalize()
      this.scene.add(PointLight)
      const ambient = new THREE.AmbientLight(0xffffff)
      // ambient.position.set(0, 0, 0)
      this.scene.add(ambient)
      this.camera.add(PointLight)
    },
    initRenderer() {
      this.css2dRender = new CSS2DRenderer()
      this.css2dRender.setSize(this.container.clientWidth, this.container.clientHeight)
      this.css2dRender.domElement.style.position = 'absolute'
      // 相对鼠标的相对偏移
      this.css2dRender.domElement.style.top = '-20px'
      this.css2dRender.domElement.style.right = '-20px'
      this.css2dRender.domElement.className = 'css2dRender'
      // 设置.pointerEvents=none，以免模型标签HTML元素遮挡鼠标选择场景模型
      this.css2dRender.domElement.style.pointerEvents = 'none'
      this.container.appendChild(this.css2dRender.domElement)
      // 抗锯齿
      this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, logarithmicDepthBuffer: true})
      this.renderer.setPixelRatio(window.devicePixelRatio)
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
      this.renderer.setClearColor(0xffffff, 1.0)
      // 把自动清除颜色缓存关闭 这个如果不关闭 后期处理这块会不能有效显示
      // 书上的描述是 如果不这样做，每次调用效果组合器的render()函数时，之前渲染的场景会被清理掉。通过这种方法，我们只会在render循环开始时，把所有东西清理一遍。
      this.renderer.autoClear = false
      // 伽马值启动 更像人眼观察的场景
      this.renderer.gammaIntput = true
      this.renderer.gammaOutput = true
      this.container.appendChild(this.renderer.domElement)
    },
    initStats() {
      this.stats = new Stats()
      this.stats.domElement.style.position = 'absolute'
      this.stats.domElement.style.left = '165px'
      this.stats.domElement.style.top = '0px'
      document.body.appendChild(this.stats.domElement)
      return this.stats
    },
    initGUI() {
      const gui = new GUI()
      gui.domElement.classList.add()
      gui.domElement.style.cssText = 'position:absolute;top:0;right:0;'
      gui.add(this.effectController, 'A').name("propName1：").listen()
      gui.add(this.effectController, 'B').name("propName2：").listen()
      gui.add(this.effectController, 'C').name("propName3：").listen()
    },
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
    initComposer() {
      this.effectComposer = new EffectComposer(this.renderer)
      this.effectComposer.renderTarget1.stencilBuffer = true
      this.effectComposer.renderTarget2.stencilBuffer = true
      // 初始化bloomPass
      const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(window.innerWidth, window.innerHeight),
          1.5,
          0.4,
          0.85
      )
      // 一些参数 可以调整看效果
      bloomPass.threshold = 0.36
      bloomPass.strength = 0.6
      bloomPass.radius = 0
      // effectCopy
      const effectCopy = new ShaderPass(CopyShader)
      // 让effectCopy渲染到屏幕上 没这句不会再屏幕上渲染
      effectCopy.renderToScreen = true
      // 添加renderPass通道，这个通道会渲染场景，但不会将渲染结果输出到屏幕上。
      const renderPass = new RenderPass(this.scene, this.camera)
      this.effectComposer.addPass(renderPass)
      // _this.effectComposer.addPass(bloomPass)
      this.effectComposer.addPass(effectCopy)
      // three.js使用OutlinePass给3D对象添加轮廓线
      this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera)
      // outlinePass.edgeStrength = 5//包围线浓度
      // outlinePass.edgeGlow = 0.5//边缘线范围
      // outlinePass.edgeThickness = 2//边缘线浓度
      // outlinePass.pulsePeriod = 2//包围线闪烁频率
      this.outlinePass.visibleEdgeColor.set(0x00ffff)//包围线颜色
      // outlinePass.hiddenEdgeColor.set('#190a05')//被遮挡的边界线颜色
      this.effectComposer.addPass(this.outlinePass)
      // 该着色器主要功能是解决锯齿问题
      const effectFXAA = new ShaderPass(FXAAShader)
      effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight)
      effectFXAA.renderToScreen = true
      this.effectComposer.addPass(effectFXAA)
      mousePick(this)
    },
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
      /*
      const equirectShader = THREE.ShaderLib['equirect']
      const equirectMaterial = new THREE.ShaderMaterial({
        fragmentShader: equirectShader.fragmentShader,
        vertexShader: equirectShader.vertexShader,
        uniforms: equirectShader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
      })
      equirectMaterial.uniforms['tEquirect'].value = this.cubeMap
      const skyBox = new THREE.Mesh(new THREE.BoxGeometry(10000, 10000, 10000), equirectMaterial)
      this.scene.add(skyBox)
      */
    },
    initModel(url) {
      return new Promise((resolve, reject) => {
        const axes = new THREE.AxesHelper(5000)
        this.scene.add(axes)
        const helper = new THREE.GridHelper(10000, 2, 0xffffff, 0xffffff)
        this.scene.add(helper)
        new MTLLoader()
            .setPath('/static/obj/')
            .load(`${url}.mtl`, materials => {

              materials.preload()

              new OBJLoader()
                  .setMaterials(materials)
                  .setPath('/static/obj/')
                  .load(`${url}.obj`, obj => {
                    if (obj) {
                      // console.log(obj)
                      obj.children.forEach(child => {
                        child.geometry.computeBoundingBox()
                        const centroid = new THREE.Vector3()
                        centroid.addVectors(child.geometry.boundingBox.min, child.geometry.boundingBox.max)
                        centroid.multiplyScalar(0.5)
                        centroid.applyMatrix4(child.matrixWorld)
                        child.geometry.center(centroid.x, centroid.y, centroid.z)
                        child.position.set(centroid.x, centroid.y, centroid.z)
                      })
                      this.scene.add(obj)
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
      const material = new THREE.LineBasicMaterial({transparent: this, opacity: 0})
      const curveObject = new THREE.Line(geometry, material)
      this.scene.add(curveObject)
      this.truck = obj.getObjectByName('truck4')
      // 声明一个数组用于存储时间序列
      /* const arr = []
       for (let i = 0; i < 101; i++) {
         arr.push(i)
       }
       // 生成一个时间序列
       const times = new Float32Array(arr)

       const posArr = []
       vertices.forEach(elem => {
         posArr.push(elem.x, elem.y, elem.z)
       })
       // 创建一个和时间序列相对应的位置坐标系列
       const values = new Float32Array(posArr)
       // 创建一个帧动画的关键帧数据，曲线上的位置序列对应一个时间序列
       const posTrack = new THREE.KeyframeTrack('.position', times, values)
       const duration = 101
       const clip = new THREE.AnimationClip("default", duration, [posTrack])
         this.mixer = new THREE.AnimationMixer(obj.getObjectByName('truck4'))
         const AnimationAction = this.mixer.clipAction(clip)
         AnimationAction.timeScale = 20
         AnimationAction.play()*/
    },
    render() {
      const delta = this.clock.getDelta()
      this.truckAnimate()
      this.controls.update()
      this.update()
      this.css2dRender.render(this.scene, this.camera)
      this.effectComposer.render(delta)
      // 请求动画帧
      this.animationID = requestAnimationFrame(this.render)
    },
    update() {
      // 更新控件
      this.stats.update()
      // 刷新动画
      TWEEN.update()
      // 更新帧动画的时间
      // this.mixer.update(delta)
      // 更新纹理移动
      this.rollTexture.offset.x += 0.001
      const time = Date.now() * 0.00005;
      for (let i = 0; i < this.scene.children.length; i++) {
        const object = this.scene.children[i];
        if (object instanceof THREE.Points) {
          object.rotation.x = -(time * (i < 4 ? i + 1 : -(i + 1)))
        }
      }
    },
    truckAnimate() {
      // 使用加减法可以设置不同的运动方向
      /* if (this.progress > 1.0) {
         return  //停留在管道末端,否则会一直跑到起点 循环再跑
       }*/
      this.progress += 0.0009
      if (this.curve) {
        const point = this.curve.getPoint(this.progress)
        const point1 = this.curve.getPoint(this.progress + 0.001)
        if (point && point.x) {
          this.truck.position.set(point.x, point.y, point.z)
          this.truck.lookAt(point1.x, point1.y, point1.z)
          if (this.followTruck) {
            this.camera.position.set(point.x, point.y + 40, point.z)
            this.camera.lookAt(point1.x, point1.y + 40, point1.z)
            this.controls.position0.set(point.x, point.y + 40, point.z)
            this.controls.target.set(point1.x, point1.y + 40, point1.z)
          }
        }
      }
      if (this.dynamicSprite) {
        this.dynamicSprite.position.set(this.truck.position.x, this.truck.position.y, this.truck.position.z)
        this.dynamicSprite.translateY(100)
      }
    },
    addCSS2DLabel() {
      if (this.css2dLabelArray.length) {
        for (const label of this.css2dLabelArray) {
          label.parent.remove(label)
        }
        this.css2dLabelArray.splice(0)
      } else {
        const labelObj = this.scene.children[this.groupIndex].children.filter(ele => ele.name.startsWith('car'))
        labelObj.forEach(ele => {
          const css2dLabel = document.createElement('div')
          css2dLabel.innerHTML = `<div style="text-align: center">${ele.name}</div><div class=".labelText">${Math.round(Math.random() * 200)}km/h</div>`
          const label = new CSS2DObject(css2dLabel)
          // label.name = ele.name + 'css2dLabel'
          this.css2dLabelArray.push(label)
          css2dLabel.classList.add('css2dLabel')
          ele.add(label)
        })
      }
    },
    addSpriteLabel(meshNames, imgUrl) {
      if (this.spriteLabelArray.length) {
        for (const label of this.spriteLabelArray) {
          label.parent.remove(label)
        }
        this.spriteLabelArray.splice(0)
      } else {
        for (const meshName of meshNames) {
          const _obj = this.scene.getObjectByName(meshName)
          const spriteMaterial = new THREE.SpriteMaterial({
            map: new THREE.TextureLoader().load(imgUrl),
            transparent: true
          })
          const sprite = new THREE.Sprite(spriteMaterial)
          sprite.name = 'sprite'
          // 把精灵模型插入到模型对象的父对象下面
          // 表示标签信息的精灵模型对象相对父对象设置一定的偏移
          sprite.position.set(_obj.position.x, _obj.position.y, _obj.position.z)
          sprite.scale.set(100, 100, 100)
          sprite.translateY(_obj.position.y + 100)
          sprite.matrixWorldNeedsUpdate = true
          this.spriteLabelArray.push(sprite)
          this.scene.add(sprite)
        }
      }
    },
    initSceneCharts(meshNames) {
      const option = {
        title: {
          text: '某站点用户访问来源',
          subtext: '纯属虚构',
          x: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: "{a} <br/>{b} : {c} ({d}%)"
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['直接访问', '邮件营销', '联盟广告', '视频广告', '搜索引擎']
        },
        series: [
          {
            name: '访问来源',
            type: 'pie',
            radius: '55%',
            center: ['50%', '60%'],
            data: [
              {value: 335, name: '直接访问'},
              {value: 310, name: '邮件营销'},
              {value: 234, name: '联盟广告'},
              {value: 135, name: '视频广告'},
              {value: 1548, name: '搜索引擎'}
            ],
            itemStyle: {
              emphasis: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      }
      const div = document.createElement('div')
      div.style.cssText = 'position: absolute;left: 0;bottom: 0;'
      div.style.width = '512px'
      div.style.height = '512px'
      for (const meshName of meshNames) {
        const _obj = this.scene.getObjectByName(meshName)
        const pieChart = echarts.init(div)
        pieChart.setOption(option)
        pieChart.on('finished', () => {
          const spriteMap = new THREE.TextureLoader().load(pieChart.getDataURL());

          const spriteMaterial = new THREE.SpriteMaterial({
            transparent: true,
            map: spriteMap,
            side: THREE.DoubleSide
          })

          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.set(500, 500, 1)
          sprite.position.set(_obj.position.x, _obj.position.y, _obj.position.z);
          this.scene.add(sprite)
          sprite.translateY(_obj.position.y + 500)
          this.scene.add(sprite)
        })
      }
    },
    initCharts() {
      for (const ele of document.querySelectorAll('.chart')) {
        ele.style.backgroundColor = 'rgba(25,25,25,0.5)'
        ele.style.display = ele.style.display === 'block' ? 'none' : 'block'
      }
      const div1 = document.querySelector('#chart1')
      const div2 = document.querySelector('#chart2')
      const pageChart1 = echarts.init(div1)
      const pageChart2 = echarts.init(div2)
      const option1 = {
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
              {value: 1048, name: 'dep1'},
              {value: 735, name: 'dep2'},
              {value: 580, name: 'dep3'},
              {value: 484, name: 'dep4'},
              {value: 300, name: 'dep5'}
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
      }
      const data = []
      for (let i = 0; i < 5; ++i) {
        data.push(Math.round(Math.random() * 200))
      }
      const option2 = {
        xAxis: {
          max: 'dataMax'
        },
        yAxis: {
          type: 'category',
          data: ['A', 'B', 'C', 'D', 'E'],
          inverse: true,
          animationDuration: 300,
          animationDurationUpdate: 300,
          max: 2 // only the largest 3 bars will be displayed
        },
        series: [
          {
            realtimeSort: true,
            name: 'X',
            type: 'bar',
            data: data,
            label: {
              show: true,
              position: 'right',
              valueAnimation: true
            }
          }
        ],
        legend: {
          show: true
        },
        animationDuration: 0,
        animationDurationUpdate: 3000,
        animationEasing: 'linear',
        animationEasingUpdate: 'linear'
      }

      function run() {
        for (let i = 0; i < data.length; ++i) {
          if (Math.random() > 0.9) {
            data[i] += Math.round(Math.random() * 2000)
          } else {
            data[i] += Math.round(Math.random() * 200)
          }
        }
        pageChart2.setOption({
          series: [
            {
              type: 'bar',
              data
            }
          ]
        })
      }

      setTimeout(() => {
        run()
      }, 0)
      setInterval(() => {
        run()
      }, 3000)
      pageChart1.setOption(option1)
      this.container.appendChild(div1)
      pageChart2.setOption(option2)
      this.container.appendChild(div2)
    },
    containBox() {
      if (this.containBoxArray.length) {
        this.cubeArray.forEach(item => item.parent.remove(item))
        this.cubeArray.splice(0)
        const index = this.scene.children.findIndex(x => x instanceof THREE.Box3Helper)
        this.containBoxArray.forEach(ele => {
          this.scene.children[this.groupIndex].add(ele.mesh)
          this.scene.children.splice(index)
          // this.scene.children.splice(5)
        })
        this.containBoxArray.splice(0)
      } else {
        for (const child of this.scene.children[this.groupIndex].children) {
          if (child.name.startsWith('dep')) {
            const box = new THREE.Box3()
            child.geometry.computeBoundingBox()
            box.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
            const helper = new THREE.Box3Helper(box, 0x1ac6ff)
            this.containBoxArray.push({mesh: child, meshBox: box})
            this.scene.add(helper)
          }
        }
        for (const ele of this.containBoxArray) {
          ele.mesh.parent.remove(ele.mesh)
          const cubeInfo = ele.meshBox.getSize(new THREE.Vector3())
          const height = cubeInfo.y - Math.round(Math.random() * 200)
          const cubeGeometry = new THREE.BoxGeometry(cubeInfo.x, height, cubeInfo.z)
          const cubeMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFFFFF * Math.random(),
            transparent: true,
            opacity: 0.8
          })
          const cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
          cube.position.set(ele.mesh.position.x, 0, ele.mesh.position.z)
          this.cubeArray.push(cube)
          // let vtHeight = 1
          new TWEEN.Tween({h: 1}).to({
            h: height
          }, 2500)
              .onUpdate(function () {
                cube.geometry = new THREE.BoxGeometry(cubeInfo.x, this._object.h, cubeInfo.z)
                // const v1 = (this._object.h - vtHeight) / 2
                // cube.position.y += v1
                // vtHeight = this._object.h
              }).easing(TWEEN.Easing.Elastic.Out).start()
          this.scene.add(cube)
        }
      }
    },
    loadTexture(url) {
      return new Promise((resolve, reject) => {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(url, map => {
          if (map) {
            resolve(map)
          } else {
            reject('load error')
          }
        });
      })
    },
    snowSprite() {
      if (this.scene.getObjectByName('particles')) {
        for (let i = 0; i < 3; i++) {
          this.scene.remove(this.scene.getObjectByName('particles'))
        }
      } else {
        // 需要加载的纹理图片
        const textureNameArray = ['test', '1', 'ma']
        const textureUrlArray = []
        for (const name of textureNameArray) {
          textureUrlArray.push(require(`../../public/static/images/${name}.png`))
        }
        // 转换为一个期约对象的数组
        const promises = textureUrlArray.map(url => this.loadTexture(url))
        // 并行执行期约返回纹理数组后开始初始化
        Promise.all(promises)
            .then(textures => {
              console.log(textures)
              const geometry = new THREE.BufferGeometry();
              const vertices = [];
              const materials = [];

              const range = 6000

              for (let i = 0; i < 1000; i++) {

                const x = Math.random() * range - range / 2
                const y = Math.random() * range - range / 2
                const z = Math.random() * range - range / 2

                vertices.push(x, y, z);

              }

              geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

              const parameters = [
                [textures[0], 500],
                [textures[1], 250],
                [textures[2], 250]
              ];

              for (let i = 0; i < parameters.length; i++) {

                const sprite = parameters[i][0];
                const size = parameters[i][1];

                materials[i] = new THREE.PointsMaterial({
                  size: size,
                  map: sprite,
                  blending: THREE.AdditiveBlending,
                  depthTest: false,
                  transparent: true
                });

                const particles = new THREE.Points(geometry, materials[i]);

                particles.name = 'particles'
                this.scene.add(particles);

              }
            })
            .catch(e => console.error(e))
        /*new THREE.TextureLoader().load(require('../../public/static/images/test.png'), map => {
          const geometry = new THREE.BufferGeometry()

          const pointsMaterial = new THREE.PointsMaterial({

            size: 500,
            transparent: true,
            opacity: 0.8,
            map: map,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthTest: false
          })

          const range = 6000

          const vertices = []
          for (let i = 0; i < 10000; i++) {
            const x = Math.random() * range - range / 2
            const y = Math.random() * range - range / 2
            const z = Math.random() * range - range / 2
            vertices.push(x, y, z)
          }
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
          geometry.center()
          const particles = new THREE.Points(geometry, pointsMaterial)
          particles.name = 'particles'
          /!*particles.rotation.x = Math.random() * 6;
          particles.rotation.y = Math.random() * 6;
          particles.rotation.z = Math.random() * 6;*!/
          this.scene.add(particles)
        })*/
      }
    },
    initFlowLabel() {
      const url = require('../../public/static/images/flow.png')
      new THREE.TextureLoader().load(url, texture => {
        this.rollTexture = texture
        const mesh1 = new FlowTexture(3330, 80, new THREE.Vector3(-500, 0, 425), {
          X: Math.PI / 2,
          Z: Math.PI / 2
        }, url, texture).getRollPlane()
        const mesh2 = new FlowTexture(850, 80, new THREE.Vector3(-900, 0, -1275), {
          X: Math.PI / 2,
          Z: 0
        }, url, texture).getRollPlane()
        const mesh3 = new FlowTexture(1300, 80, new THREE.Vector3(-1300, 0, -1950), {
          X: Math.PI / 2,
          Z: Math.PI / 2
        }, url, texture).getRollPlane()
        for (const mesh of Array.of(mesh1, mesh2, mesh3)) {
          this.scene.children[this.groupIndex].add(mesh)
        }
      })
    },
    spriteCanvas(mesh, parameters) {
      const dynamicLabel = this.scene.getObjectByName('dynamicLabel')
      if (dynamicLabel) {
        this.scene.remove(dynamicLabel)
        clearInterval(this.timer)
      } else {
        const obj = this.scene.getObjectByName(mesh)
        const canvas = document.createElement('canvas')
        canvas.height = parameters.height
        canvas.width = parameters.width
        const ctl = canvas.getContext('2d')
        ctl.fillStyle = 'rgba(102, 255, 153, 0.5)'
        ctl.fillRect(0, 0, parameters.width, parameters.height)
        ctl.textAlign = 'center'
        ctl.textBaseline = 'middle'
        ctl.font = 'bold 20px Arial'
        ctl.lineWidth = 32
        ctl.fillStyle = "rgba(25, 25, 25, 1.0)"
        ctl.fillText(parameters.text, parameters.x, parameters.y)

        const texture = new THREE.Texture(canvas)
        texture.needsUpdate = true
        const spriteMaterial = new THREE.SpriteMaterial({map: texture})
        const sprite = new THREE.Sprite(spriteMaterial)
        sprite.position.set(obj.position.x + parameters.x, obj.position.y + parameters.y, obj.position.z + parameters.z)
        sprite.name = parameters.name
        sprite.scale.set(100, 100, 100)
        sprite.translateY(100)
        this.scene.add(sprite)
        this.canvas = canvas
        this.dynamicSprite = sprite

        this.timer = setInterval(() => {
          const canvas = this.canvas
          const ctl = canvas.getContext('2d')
          ctl.clearRect(0, 0, 60, 40)
          ctl.fillStyle = 'rgba(102, 255, 153, 0.5)'
          ctl.fillRect(0, 0, 60, 40)
          ctl.textAlign = 'center'
          ctl.textBaseline = 'middle'
          ctl.font = 'bold 20px Arial'
          ctl.lineWidth = 32
          ctl.fillStyle = "rgba(25, 25, 25, 1.0)"
          ctl.fillText(`${Math.round(Math.random() * 20)}M/s`, 30, 20)
          this.dynamicSprite.material.map.needsUpdate = true
        }, 1000)
      }
    },
    onWindowResize() {
      this.camera.aspect = window.innerWidth / window.innerHeight
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
      this.css2dRender.setSize(this.container.clientWidth, this.container.clientHeight)
      // this.render()
    }
  }
}
</script>

<style scoped lang="less">
.label {
  position: absolute;
  background: rgba(0, 0, 0, 0.6);
  color: #ffffff;

  span {
    display: inline-block;
    width: 100px;
  }
}

.chartLayout {
  width: 500px;
  height: 500px;
  position: absolute;
  bottom: 0;
  display: block;
  border-radius: 10px;
}

#chart1:extend(.chartLayout) {
  left: 165px;
}

#chart2:extend(.chartLayout) {
  right: 0;
}

.el-menu {
  height: 100%;
}

.el-main {
  padding: 0;
  margin: 0;
}


/deep/ .css2dLabel {
  padding: 4px 10px;
  color: #ffbbaa;
  background-color: rgba(25, 25, 25, 0.5);
  position: absolute;
  border-radius: 5px;
  font-size: 16px;
  pointer-events: none;

  &::after {
    border: 5px solid transparent;
    border-top-color: rgba(25, 25, 25, 0.5);
    content: '';
    height: 0;
    width: 0;
    position: absolute;
    top: 100%;
    left: 10px;
  }
}

</style>

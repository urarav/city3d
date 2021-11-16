/**
 * @description: 鼠标拾取模块
 * @author: sunQi
 * @createDate: 2021/11/6
 * */
import * as THREE from 'three'
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass"
import {ShaderPass} from "three/examples/jsm/postprocessing/ShaderPass"
import {FXAAShader} from "three/examples/jsm/shaders/FXAAShader"
import {OutlinePass} from "three/examples/jsm/postprocessing/OutlinePass"
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass"
import {TWEEN} from "three/examples/jsm/libs/tween.module.min"
import {CopyShader} from "three/examples/jsm/shaders/CopyShader";

function threeJSComposer(_this) {
    const rayCaster = new THREE.Raycaster()
    let x, y
    const mouse = new THREE.Vector2()
    const selectedObjects = []
    // 初始化bloomPass
    const bloomPass = new UnrealBloomPass(
        // 没研究过这些参数的意义 会提上日程
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
    );
    // 一些参数 可以调整看效果
    bloomPass.threshold = 0.36;
    bloomPass.strength = 0.6;
    bloomPass.radius = 0;

    // effectCopy
    const effectCopy = new ShaderPass(CopyShader);
    // 让effectCopy渲染到屏幕上 没这句不会再屏幕上渲染
    effectCopy.renderToScreen = true
    // 添加renderPass通道，这个通道会渲染场景，但不会将渲染结果输出到屏幕上。
    const renderPass = new RenderPass(_this.scene, _this.camera)
    _this.effectComposer.addPass(renderPass)
    // _this.effectComposer.addPass(bloomPass)
    _this.effectComposer.addPass(effectCopy)
    // three.js使用OutlinePass给3D对象添加轮廓线
    const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), _this.scene, _this.camera)
    // outlinePass.edgeStrength = 5//包围线浓度
    // outlinePass.edgeGlow = 0.5//边缘线范围
    // outlinePass.edgeThickness = 2//边缘线浓度
    // outlinePass.pulsePeriod = 2//包围线闪烁频率
    outlinePass.visibleEdgeColor.set(0x00ffff)//包围线颜色
    // outlinePass.hiddenEdgeColor.set('#190a05')//被遮挡的边界线颜色
    _this.effectComposer.addPass(outlinePass)
    // 该着色器主要功能是解决锯齿问题
    const effectFXAA = new ShaderPass(FXAAShader)
    effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight)
    effectFXAA.renderToScreen = true
    _this.effectComposer.addPass(effectFXAA)
    const label = document.querySelector('.label')
    window.addEventListener('click', onMouseClick)
    window.addEventListener('dblclick', onMouseDBClick)

    // tooltip显示位置
    function displayAt(tooltip, x, y) {
        tooltip.style.display = 'block'
        tooltip.style.left = `${x}px`
        tooltip.style.top = `${y - 40}px`
    }


    // current1 相机当前的位置
    // target1 相机的controls的target
    // current2 新相机的目标位置
    // target2 新的controls的target
    function animateCamera(current1, target1, current2, target2) {

        let positionVar = {
            x1: current1.x,
            y1: current1.y,
            z1: current1.z,
            x2: target1.x,
            y2: target1.y,
            z2: target1.z
        }
        //关闭控制器
        _this.controls.enabled = false
        const tween = new TWEEN.Tween(positionVar)
        tween.to({
            x1: current2.x,
            y1: current2.y,
            z1: current2.z,
            x2: target2.x,
            y2: target2.y,
            z2: target2.z
        }, 1000)

        tween.onUpdate(() => {
            _this.camera.position.x = positionVar.x1
            _this.camera.position.y = positionVar.y1
            _this.camera.position.z = positionVar.z1
            _this.controls.target.x = positionVar.x2
            _this.controls.target.y = positionVar.y2
            _this.controls.target.z = positionVar.z2
            _this.controls.update()
        })

        tween.onComplete(() => {
            ///开启控制器
            _this.controls.enabled = true
        })

        tween.easing(TWEEN.Easing.Cubic.InOut)
        tween.start()
    }

    // 相机视角切换
    function onMouseDBClick(event) {
        event.preventDefault()
        const vector = new THREE.Vector3()//三维坐标对象
        vector.set(mouse.x, mouse.y, 0.5)
        vector.unproject(_this.camera)
        const caster = new THREE.Raycaster(_this.camera.position, vector.sub(_this.camera.position).normalize())
        const intersects = caster.intersectObjects(_this.scene.children[3].children)
        if (intersects.length > 0) {
            const selected = intersects[0]//取第一个物体
            if (selected.object.name !== '') {
                vector.set(selected.point.x, selected.point.y, selected.point.z)
                // console.log("x坐标:" + selected.point.x)
                // console.log("y坐标:" + selected.point.y)
                // console.log("z坐标:" + selected.point.z)
                const targetCameraPosition = vector.clone().add(new THREE.Vector3(500, 500, 500))
                animateCamera(_this.camera.position, _this.controls.target, targetCameraPosition, vector.clone())
            }
        }
    }

    function onMouseClick(event) {
        if (event.changedTouches) {
            x = event.changedTouches[0].pageX
            y = event.changedTouches[0].pageY
        } else {
            x = event.clientX
            y = event.clientY
        }
        const rect = _this.container.getBoundingClientRect();//拿到div相对屏幕坐标的偏移量
        //屏幕坐标转标准设备坐标
        mouse.x = ((x - rect.left) / this.container.clientWidth) * 2 - 1;
        mouse.y = -((y - rect.top) / this.container.clientHeight) * 2 + 1;
        rayCaster.setFromCamera(mouse, _this.camera)

        const intersects = rayCaster.intersectObjects([_this.scene], true)
        if (intersects[0]) {
            const soName = intersects[0].object.name
            // 判断是否显示tooltip
            if (intersects.length === 0 ||
                soName === '' ||
                soName === 'line') {
                // 隐藏说明性标签
                label.style.display = 'none'
                return
            }
            switch (soName.substring(0, 3)) {
                case 'tru':
                    _this.dataInfo = [
                        {key: '车辆名称', value: soName},
                        {key: '车牌', value: Math.round(Math.random() * 20000)}]
                    displayAt(label, x, y)
                    break
                case 'dep':
                    _this.dataInfo = [
                        {key: '楼栋名称', value: soName},
                        {key: '居住人数', value: Math.round(Math.random() * 200)},
                        {key: '楼栋层数', value: Math.round(Math.random() * 50)}]
                    displayAt(label, x, y)
                    break
                case 'car':
                    _this.dataInfo = [
                        {key: '车辆名称', value: soName},
                        {key: '车牌', value: Math.round(Math.random() * 20000)}]
                    displayAt(label, x, y)
                    break
                case 'bas':
                    _this.dataInfo = [
                        {key: '场景', value: soName},
                        {key: '是否空闲', value: '是'}]
                    displayAt(label, x, y)
                    break
                case 'tre':
                    _this.dataInfo = [
                        {key: '场景', value: soName},
                        {key: '健康数量', value: 15},
                        {key: '不健康数量', value: 6}]
                    displayAt(label, x, y)
                    break
                case 'htt':
                    _this.dataInfo = [
                        {key: '场景', value: soName},
                        {key: '剩余车位', value: 10},
                        {key: '出入状态', value: '开启'}]
                    displayAt(label, x, y)
                    break
                default:
                    label.style.display = 'none'
                    selectedObjects.pop()
                    break
            }
            if (soName.startsWith('trafficLight')) {
                const parentDiv = document.createElement('div')
                parentDiv.className = 'parentVideo'
                parentDiv.style.position = 'absolute'
                parentDiv.style.display = 'none'
                parentDiv.style.backgroundColor = 'rgba(0, 255, 255, 0.5)'
                const titleDiv = document.createElement('div')
                titleDiv.style.cssText = 'height: 24px;inline-height: 24px;float: left'
                titleDiv.textContent = '监控录像'
                const closeDiv = document.createElement('div')
                closeDiv.className = 'videoImg'
                closeDiv.addEventListener('click', () => {
                    const videoDiv = document.querySelectorAll('.parentVideo')
                    for (const e of videoDiv) {
                        e.remove()
                    }
                })
                parentDiv.appendChild(titleDiv)
                parentDiv.appendChild(closeDiv)
                const videoLabel = document.createElement('video')
                videoLabel.autoplay = true
                videoLabel.muted = true
                videoLabel.controls = true
                videoLabel.loop = true
                videoLabel.style.width = '100%'
                videoLabel.style.height = '100%'
                const videoSource = document.createElement('source')
                videoSource.src = 'static/video/video.mp4'
                videoSource.type = 'video/mp4'
                videoLabel.appendChild(videoSource)
                parentDiv.appendChild(videoLabel)
                document.body.appendChild(parentDiv)
                displayAt(parentDiv, x, y)
            } else {
                // 设置标签位置
                // 显示模型信息
                // label.textContent = soName
                selectedObjects.pop()
                selectedObjects.push(intersects[0].object)
                // 给选中的线条和物体加发光特效
                outlinePass.selectedObjects = selectedObjects
            }
            _this.effectController.name = soName
            _this.effectController.num = Math.round(Math.random() * 200)
            _this.effectController.layerNum = Math.round(Math.random() * 50)
        }
    }
}

export {threeJSComposer}

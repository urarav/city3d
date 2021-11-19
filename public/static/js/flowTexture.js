/**
 * @description: 流动纹理类
 * @author: 37
 * @createDate: 2021/11/18
 * */
import * as THREE from 'three'

class FlowTexture {
    constructor(width, height, position, rotate, textureUrl, texture) {
        this.width = width
        this.height = height
        this.position = position
        this.rotate = rotate
        this.textureUrl = textureUrl
        this.texture = texture
    }

    get textureMap() {
        return this.texture
    }

    set textureMap(textureMap) {
        this.texture = textureMap
    }

    get textureURL() {
        return this.textureUrl
    }

    set textureURL(textureURL) {
        this.textureUrl = textureURL
    }

    // 获取planeMesh
    getRollPlane() {
        if (this.texture) {
            return this.#createMesh(this.texture)
        } else {
            new THREE.TextureLoader().load(this.textureUrl, texture => {
                this.texture = texture
                return this.#createMesh(texture)
            })
        }
    }

    // private
    #createMesh(texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        const rollMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        })
        // 其实也可以自定义几何体类型作为constructor参数
        const geometry = new THREE.PlaneGeometry(this.width, this.height)
        const meshObj = new THREE.Mesh(geometry, rollMaterial)
        meshObj.position.set(this.position.x, this.position.y, this.position.z)
        meshObj.rotateX(this.rotate.X)
        meshObj.rotateZ(this.rotate.Z)
        return meshObj
    }
}

export {FlowTexture}

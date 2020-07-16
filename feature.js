/* global postMessage */

// const uuid = require('uuid/v4')
import { Vector3 } from './vendor/babylonjs/Maths/math'

const throttle = require('lodash.throttle')
const EventEmitter = require('events')

class Feature extends EventEmitter {
  constructor (parcel, obj) {
    super()

    this.parcel = parcel
    this.uuid = obj.uuid
    this._content = obj

    const mutated = throttle(() => {
      const s = Object.assign({}, this._content)

      this._position.toArray(s.position)
      this._rotation.toArray(s.rotation)
      this._scale.toArray(s.scale)

      // console.log(`Mutated`)

      this.set(s)
    }, 10, { leading: false, trailing: true })

    const handler = attr => {
      return {
        set (target, key, value) {
          // console.log(`Setting ${attr}.${key} as ${value}`)
          target[key] = value
          mutated()
          return value
        }
      }
    }

    this._position = new Vector3()
    this.position = new Proxy(this._position, handler('position'))

    this._rotation = new Vector3()
    this.rotation = new Proxy(this._rotation, handler('rotation'))

    this._scale = new Vector3()
    this.scale = new Proxy(this._scale, handler('scale'))

    this.updateVectors()
  }

  get id () {
    return this._content.id
  }

  get type () {
    return this._content.type
  }

  get description () {
    return this._content
  }

  get (key) {
    return this._content[key]
  }

  getSummary () {
    return `position: ${this.position.toArray()}`
  }

  set (dict) {
    Object.assign(this._content, dict)

    this.updateVectors()
    this.save()
  }

  updateVectors () {
    this._position.set(this._content.position[0], this._content.position[1], this._content.position[2])
    this._rotation.set(this._content.rotation[0], this._content.rotation[1], this._content.rotation[2])
    this._scale.set(this._content.scale[0], this._content.scale[1], this._content.scale[2])
  }

  save () {
    this.parcel.broadcast({
      type: 'update',
      uuid: this.uuid,
      content: this._content
    })
  }

  /*

  createAnimation (key) {
    return new Animation(null, key, 30, Animation.ANIMATIONTYPE_VECTOR3)
  }

  startAnimations (animationArray) {
    const animations = animationArray.map(a => {
      const animation = a.clone()

      animation._keys.unshift({
        frame: 0,
        value: this[animation.targetProperty].clone()
      })

      return animation.serialize()
    })

    this.parcel.broadcast({
      type: 'animate',
      uuid: this.uuid,
      animations
    })
  }

  */

  remove () {
    this.parcel.removeFeature(this)
  }
}

class Audio extends Feature {
  play () {
    this.parcel.broadcast({
      type: 'play',
      uuid: this.uuid
    })
  }
}

class TextInput extends Feature {
  constructor (parcel, obj) {
    super(parcel, obj)

    this.on('changed', (e) => {
      this.text = e.text
    })
  }
}

class Video extends Feature {
  play () {
    this.parcel.broadcast({
      type: 'play',
      uuid: this.uuid
    })
  }
}

class VidScreen extends Feature {
  constructor (parcel, obj) {
    super(parcel, obj)

    this.on('start', () => this.start())
    this.on('stop', () => this.stop())
  }

  start () {
    this.screen = new Uint8Array(64 * 64 * 3)
    this.screenWidth = 64
    this.screenHeight = 64

    this._interval = setInterval(() => {
      this.emit('frame')

      postMessage({
        type: 'screen',
        uuid: this.uuid,
        screen: this.screen
      })
    }, 1000 / 30)
  }

  stop () {
    clearInterval(this._interval)
  }
}

Feature.create = (parcel, obj) => {
  if (obj.type === 'audio') {
    return new Audio(parcel, obj)
  } else if (obj.type === 'video') {
    return new Video(parcel, obj)
  } else if (obj.type === 'vid-screen') {
    return new VidScreen(parcel, obj)
  } else if (obj.type === 'text-input') {
    return new TextInput(parcel, obj)
  } else {
    return new Feature(parcel, obj)
  }
}

module.exports = Feature

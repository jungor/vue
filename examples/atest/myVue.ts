function noop () {}

function isObject (obj) {
  return obj !== null && typeof obj === 'object'
}

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 * 深度遍历对象树，使得每个子对象或子属性对应的dep都能在依赖收集过程中被收集
 */
function traverse (val) {
  _traverse(val, seenObjects)
  seenObjects.clear()
}

function _traverse (val, seen) {
  let i, keys
  const isA = Array.isArray(val)
  if ((!isA && !isObject(val)) || Object.isFrozen(val)) {
    return
  }
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}

const targetStack: Watcher[] = []

function pushTarget (_target?: Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

function popTarget () {
  Dep.target = targetStack.pop()
}

const bailRE = /[^\w.$]/
function parsePath (path) {
  if (bailRE.test(path)) {
    return
  }
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}
function hasOwn (obj, key) {
  return obj.hasOwnProperty(key)
}

function isPlainObject (val) {
  return Object.prototype.toString.call(val) === '[object Object]'
}

function remove (arr, item) {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

function observe (value) {
  let ob
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value)
  ) {
    ob = new Observer(value)
  }
  return ob
}

function defineReactive (obj, key) {
  const dep = new Dep()
  const pd = Object.getOwnPropertyDescriptor(obj, key)
  if (!pd) return
  const oldGet = pd.get
  const oldSet = pd.set
  let val

  if (!oldGet) {
    val = obj[key]
  }
  let childObj = observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const rtnVal = oldGet ? oldGet.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childObj) {
          childObj.dep.depend()
        }
      }
      return rtnVal
    },
    set: function reactiveSetter (newVal) {
      const oldVal = oldGet ? oldGet.call(obj) : val
      if (oldVal === newVal || (Number.isNaN(oldVal) && Number.isNaN(newVal))) {
        return
      }
      if (oldSet) {
        oldSet.call(obj, newVal)
      } else {
        val = newVal
      }
      childObj = observe(newVal)
      dep.notify()
    }
  })
}

/**
 * 发布者
 * @param value
 * @constructor
 */
class Observer {
  value: any

  constructor (value) {
    this.value = value
    Object.defineProperty(value, '__ob__', {
      value: this,
      enumerable: false,
      writable: true,
      configurable: true
    })
    if (Array.isArray(value)) {
      // todo
    } else if (Object.prototype.toString.apply(value) === '[object Object]') {
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items) {
    // for (let i = 0, l = items.length; i < l; i++) {
    //   observe(items[i])
    // }
  }
}

class Dep {
  static target: Watcher | undefined | null
  id: number
  subs: Watcher[]

  constructor () {
    // this.id = Dep.uid++
    this.subs = []
  }

  /**
   * 添加订阅者
   * @param sub
   */
  public addSub (sub) {
    this.subs.push(sub)
  }

  /**
   * 移除订阅者
   * @param sub
   */
  public removeSub (sub) {
    remove(this.subs, sub)
  }

  /**
   * 让当下订阅者依赖自己。在同一个时刻，只会有一个订阅者在收集依赖
   */
  public depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  /**
   * 通知所有订阅者自己已发生变化
   */
  public notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

class Watcher {
  static uid: number = 0
  deep: boolean
  user: boolean
  dep: Dep
  value: any
  getter: (vm: Vue) => any
  id: number
  active: boolean
  computed: boolean
  dirty: boolean
  deps: Dep[]
  newDeps: Dep[]
  depIds: Set<number>
  newDepIds: Set<number>
  expression: string
  vm: Vue
  cb: () => any
  constructor (
    vm,
    expOrFn,
    cb,
    options,
    isRenderWatcher
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    this.cb = cb
    this.id = ++Watcher.uid // uid for batching
    this.active = true
    this.dirty = this.computed // for computed watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      // @ts-ignore
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && console.warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    if (this.computed) {
      this.value = undefined
      this.dep = new Dep()
    } else {
      this.value = this.get()
    }
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 计算value，同时依赖收集
   */
  get () {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        // handleError(e, vm, `getter for watcher "${this.expression}"`)
        console.error(`getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   * 在这个观察者的新依赖列表中添加一个依赖
   */
  addDep (dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 收集完依赖后移除不再依赖的依赖中注册的回调函数，
   * 并且把新收集到的依赖正式变为当前依赖，再进行一些必要的变量清理
   */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp: any = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   * 注册到依赖的回调函数。（注册的其实是watcher对象，但是依赖更新会调用watcher对象的这个方法）
   */
  update () {
    /* istanbul ignore else */
    setTimeout(() => {
      this.run()
    }, 0)
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   * 让调度器执行的回调函数
   */
  run () {
    if (this.active) {
      this.getAndInvoke(this.cb)
    }
  }

  getAndInvoke (cb) {
    const value = this.get()
    if (
      value !== this.value ||
      // Deep watchers and watchers on Object/Arrays should fire even
      // when the value is the same, because the value may
      // have mutated.
      isObject(value) ||
      this.deep
    ) {
      // set new value
      const oldValue = this.value
      this.value = value
      this.dirty = false
      if (this.user) {
        try {
          cb.call(this.vm, value, oldValue)
        } catch (e) {
          // handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          console.error(`callback for watcher "${this.expression}"`)
        }
      } else {
        cb.call(this.vm, value, oldValue)
      }
    }
  }

  /**
   * Evaluate and return the value of the watcher.
   * This only gets called for computed property watchers.
   */
  evaluate () {
    if (this.dirty) {
      this.value = this.get()
      this.dirty = false
    }
    return this.value
  }

  /**
   * Depend on this watcher. Only for computed property watchers.
   */
  depend () {
    if (this.dep && Dep.target) {
      this.dep.depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      remove(this.vm._watchers, this)
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */

function getData (data, vm) {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e) {
    // handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const sharedPropertyDefinition: PropertyDescriptor = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

function proxy (target, sourceKey, key) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

class Vue {
  static uid: number = 0
  _uid: number
  $options: any
  _data: any
  _watchers: Watcher[]

  constructor (options) {
    const vm = this
    // a uid
    this._uid = Vue.uid++
    this.$options = options
    this._watchers = []
    const methods = this.$options.methods
    let data = this.$options.data
    if (methods) {
      for (const key of Object.keys(methods)) {
        this[key] = methods[key] == null || typeof methods[key] === 'function' ? noop : methods[key].bind(this)
      }
    }
    if (data) {
      data = this._data = typeof data === 'function'
        ? getData(data, this)
        : data
      if (!isPlainObject(data)) {
        data = {}
      }
      // proxy data on instance
      const keys = Object.keys(data)
      // const props = this.$options.props
      // const methods = this.$options.methods
      let i = keys.length
      while (i--) {
        const key = keys[i]
        proxy(this, `_data`, key)
      }
      // observe data
      observe(data)
    } else {
      observe(this._data = {})
    }
    // new Watcher(this, render, update, {}, true)
  }

}

function compileToFn (template) {
  return function render (vm: Vue) {
    vm.$options.el.
  }
}

// let data = {
//   num: 1
// }
//
// const vm = new Vue({
//   data
// })
//
// new Watcher(vm, 'num', (oldVal, newVal) => {
//   console.log(oldVal, newVal)
// }, {}, false)
//
// data.num++

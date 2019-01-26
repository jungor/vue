class Observer {
  // data: any;
  constructor(value) {
    if (value && typeof value === 'object') {
      value.__ob__ = this;
      this.data = value;
      for (let k of Object.keys(value)) {
        defineReactive(value, k)
      }
    }
  }
}

class Watcher {
  // vm: MVVM;
  // getter: () => any;
  // value: any;
  constructor(vm, getter) {
    this.vm = vm;
    this.getter = getter;
    this.value = this.get()
  }
  update() {
    setTimeout(() => {
      this.value = this.get()
    }, 0);
  }
  get() {
    TARGET = this;
    const v = this.getter.call(this.vm, this.vm);
    TARGET = null;
    return v
  }
}

class Dep {
  // listeners: Watcher[];
  constructor() {
    this.listeners = []
  }
  depend(target) {
    if (this.listeners.indexOf(target) === -1) {
      this.listeners.push(target)
    }
  }
  notify() {
    for (let listener of this.listeners) {
      listener.update()
    }
  }
}

function observe(value) {
  if (value && typeof value === 'object') {
    new Observer(value)
  }
}

// let TARGET: Watcher | null = null;
let TARGET = null;

function defineReactive(obj, key) {
  let val = obj[key];
  let dep = new Dep();
  Object.defineProperty(obj, key, {
    get() {
      if (TARGET) {
        dep.depend(TARGET)
      }
      return val
    },
    set(newVal) {
      if (newVal !== val) {
        val = newVal;
        dep.notify()
      }
    },
    enumerable: true,
    configurable: true
  })
}


function proxy(target, src) {
  for (let key of Object.keys(src)) {
    Object.defineProperty(target, key, {
      get() {
        return src[key]
      },
      set(newVal) {
        return src[key] = newVal
      },
      enumerable: true,
      configurable: true
    })
  }
}

export default class Vue {
  // options: any;
  // el: HTMLElement;
  // data: any;
  // render: () => any;
  // html: string;
  // watcher: Watcher;
  constructor(options) {
    this.options = options;
    this.el = document.querySelector(options.el);
    let template = this.el.innerHTML;
    this.data = options.data instanceof Function ? options.data() : options.data;
    this.render = compile2RenderFn(template, this);
    proxy(this, this.data);
    observe(this.data);
    this.html = this.render();
    this.mount();
    this.watcher = new Watcher(this, () => {
      this.html = this.render();
      this.mount()
    })
  }
  mount() {
    this.el.innerHTML = this.html
  }
}

function compile2RenderFn(template, vm) {
  return function render() {
    return template.replace(/{{([^}]*)}}/g, (_, match) => eval('vm.' + match))
  }
}

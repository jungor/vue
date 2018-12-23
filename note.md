# vue源码阅读笔记

## 1. 为什么除了`Observer`和`watcher`，还要搞个`Dep`？

因为一个Observer观察的是一个对象。比如我们有一个对象`var obj = {a:1,b:2}`，并且将其变为Observable`observe(obj)`，
要监察对象`obj`的`a`属性的变化，假若没有Dep，watcher直接依赖Observer，那么，
收集依赖的时候，会当成watcher依赖整个Observer，而当obj的其他属性变化时，
也会触发无用的向watcher的通知。因此引入Dep，Dep是针对某一个Observable的一种一个属性，
当`observe(obj)`的时候，会对obj的每一个属性通过`defineReactive`变为可观察属性，同时为其定义了一个Dep。
当watcher手机依赖的时候，依赖都是一个个的dep，而不是observable，因此其他属性变化是就不会触发额外的变更通知。

## 2. 依赖更新时为什么computed同步更新，而watcher不会？

其实在vue的实现里，computed也是watcher，不过是特殊的watcher，当它的依赖更新时

## 3. 为什么
"use strict";

var send = require("./send")
var watch = require("watchables/watch")
var unwatch = require("watchables/unwatch")

// `Event` is data type representing a stream of values that can be dispatched
// manually in an imperative style by calling `send(event, value)`
function Event() {}

// `Event` type has internal property of for aggregating `watchers`. This
// property has a unique name and is intentionally made non-enumerable (in
// a future it will be a private names
// http://wiki.ecmascript.org/doku.php?id=harmony:private_name_objects) so
// that it's behavior can not be tempered.
var observers = "watchers@" + module.id
Object.defineProperty(Event.prototype, observers, {
  value: void(0), enumerable: false, configurable: false, writable: true
})

// ## Watchable
//
// Type implements subset of `Watchable` abstraction to allow registration
// and un-registration of watchers that would wish to be notified on once
// new value are dispatched. Type intentionally does not implements `watchers`
// method so that inconsistent event dispatch could not be emulated.

// ### watch
//
// `Event` type implements `watch` as a primary mechanism for subscribing to a
// new dispatched values of the given instance. `watcher` must be a function.
watch.define(Event, function watchEvent(event, watcher) {
  var watchers = event[observers]
  // Event type optimizes for a case with a single `watcher` case as it's a
  // most common case.
  switch (typeof(watchers)) {
    // If there is no watchers yet `watcher` is stored directly without
    // creation of an array.
    case "undefined":
      event[observers] = watcher
      return void(0)
    // If type is a `function` then `event` already has a `watcher`, in such
    // case array of pre-existing and a new watcher is created, unless
    // pre-existing watcher is this one (in such case do nothing to avoid
    // double notifications of a same watcher).
    case "function":
      if (watchers !== watcher) event[observers] = [watchers, watcher]
      return void(0)
    // Otherwise it's an array and a `watcher` is pushed into it was already
    // in it.
    default:
      if (watchers.indexOf(watcher) < 0) watchers.push(watcher)
      return void(0)
  }
})

// ### unwatch
//
// `Event` type implements `unwatch` function that can be used to unsubscribe
// a `watcher` from the new values for the given `event`.
unwatch.define(Event, function unwatchEvent(event, watcher) {
  var watchers = event[observers]
  // Optimize for a case when it's an only `watcher`.
  if (watchers === watcher) {
    event[observers] = void(0)
    return void(0)
  }


  switch (typeof(watchers)) {
    // If `event` has no `watchers` ignore.
    case "undefined": return void(0)
    // If `event` has an only watcher different from given one (it's different
    // since other case was handled in `if` clause already) ignore.
    case "function": return void(0)
    // Otherwise `event` has multiple `watchers`, if given `watcher` is one
    // of them remove it from the `watchers` array.
    default:
      var index = watchers.indexOf(watcher)
      if (index >= 0) watchers.splice(index, 1)
      // If only single watcher is left set it as internal `watchers` property
      // to optimize a dispatch by avoiding slicing arrays and enumerations.
      if (watchers.length === 1) event[observers] = watchers[0]
      return void(0)
  }
})

// ## send
//
// `Event` type implements `send` as a primary mechanism for dispatching new
//  values of the given `event`. All of the `watchers` of the `event` will
//  be invoked in FIFO order. Any new `watchers` added in side effect to this
//  call will not be invoked until next `send`. Note at this point `send` will
//  return `false` if no watchers have being invoked and will return `true`
//  otherwise, although this implementation detail is not guaranteed and may
//  change in a future.
send.define(Event, function sendEvent(event, value) {
  var watchers = event[observers]
  switch (typeof(watchers)) {
    // If there are no watchers return `false`
    case "undefined":
      return false
    // If event has only `watcher` invoke it and return `true`
    case "function":
      watchers(value)
      return true
    // Otherwise slice array of watchers (this will guarantee that `unwatch`
    // and `watch` calls in side effect to the dispatch will not break FIFO
    // dispatch order) and invoke each one with a value. Return `true` as
    // result.
    default:
      watchers = watchers.slice()
      var index = 0
      var count = watchers.length
      while (index < count) {
        watchers[index](value)
        index = index + 1
      }
      return true
  }
})

function event(callback) {
  /**
  Function creates new `Event` that can be `watched` for a new values `send`-ed
  on it. Also `send` function can be used on returned instance to send new
  values.

  ## Example

  var e = event()

  send(e, 0)

  watch(e, consolel.log.bind(console, "=>"))

  send(e, 1) // => 1
  send(e, 2) // => 2
  **/
  var ev = new Event()

  callback && callback(function next(data) {
    send(ev, data)
  })

  return ev
}
event.type = Event

module.exports = event

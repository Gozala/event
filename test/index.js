"use strict";

var send = require("../send")
var event = require("../event")
var watch = require("watchables/watch")
var unwatch = require("watchables/unwatch")

exports["test watch event"] = function(assert) {
  var e = event()

  var actual = []

  watch(e, function(data) { actual.push(data) })

  send(e, "hello", "a", "b")
  send(e, "world")

  assert.deepEqual(actual, ["hello", "world"], "two values send to an event")
}

exports["test send on unwatched event"] = function(assert) {
  var actual = []
  var e = event()

  send(e, "hello", "a", "b")

  watch(e, function(data) { actual.push(data) })

  send(e, "world")

  assert.deepEqual(actual, ["world"], "got only value dispatched after watch")
}

exports["test FIFO dispatch on event"] = function(assert) {
  var actual = []
  var e = event()

  function watcherSideEffect1(value) {
    actual.push(value + "#@")
    unwatch(e, watcher2)
    unwatch(e, watcherSideEffect1)
    watch(e, watcher3)
  }
  function watcher1(value) { actual.push(value + "#1") }
  function watcher2(value) { actual.push(value + "#2") }
  function watcher3(value) { actual.push(value + "#3") }

  watch(e, watcher1)
  send(e, "a")
  watch(e, watcherSideEffect1)
  watch(e, watcher2)
  send(e, "b")
  send(e, "c")
  send(e, "d")

  assert.deepEqual(actual, [
    "a#1", "b#1", "b#@", "b#2", "c#1", "c#3", "d#1", "d#3"
  ], "events are dispatched in FIFO order")
}

exports["test start watch several times"] = function(assert) {
  var e = event()
  var actual = []
  function watcher1(value) { actual.push(value + "#1") }
  function watcher2(value) { actual.push(value + "#2") }

  watch(e, watcher1)

  send(e, "a")

  watch(e, watcher1)

  send(e, "b")

  watch(e, watcher2)
  watch(e, watcher1)
  unwatch(e, function() {})

  send(e, "c")

  unwatch(e, watcher1)

  send(e, "d")

  watch(e, watcher2)

  send(e, "e")

  watch(e, watcher1)

  send(e, "f")

  watch(e, watcher1)

  send(e, "g")

  unwatch(e, watcher2)
  unwatch(e, watcher2)
  unwatch(e, watcher1)
  unwatch(e, watcher1)

  send(e, "h")

  assert.deepEqual(actual, [
    "a#1", "b#1", "c#1", "c#2", "d#2", "e#2", "f#2", "f#1", "g#2", "g#1"
  ], "subsequent watch & unwatches are ignored")
}

require("test").run(exports)

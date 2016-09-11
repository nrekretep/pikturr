'use strict'

var childProcess = require('child_process')
var path = require('path')
var util = require('util')

var NAILGUN_JAR = path.join(__dirname, '../vendor/nailgun.jar')
var JAVA = 'java'
var ARGS = ['-Djava.awt.headless=true', '-jar', NAILGUN_JAR]

module.exports.createServer = function (options, callback) {
  if (util.isFunction(options)) {
    callback = options
    options = undefined
  }

  var args = ARGS

  if (options) {
    if (options.port && isNaN(options.port)) {
      throw new TypeError('port must be a number')
    }

    if (options.address && typeof options.address !== 'string') {
      throw new TypeError('address must be a string')
    }

    if (options.address && options.port !== undefined) {
      args = args.concat(options.address + ':' + options.port)
    } else if (options.port !== undefined) {
      args = args.concat(options.port)
    } else if (options.address) {
      args = args.concat(options.address + ':' + 2113)
    }
  }

  var server = childProcess.spawn(JAVA, args)

  server.stdout.on('data', function (data) {
    var started = data.toString().match(/^NGServer started on .+, port \d+./)
    if (started) {
      var portStr = started[0].match(/(port )+(\d+)/)[2]
      var port = parseInt(portStr, 10)

      if (util.isFunction(callback)) {
        callback(port)
      }
    }
  })

  function shutdown () {
    server.kill()
  }

  process.on('exit', shutdown)

  process.on('uncaughtException', function (err) {
    shutdown()
    throw err
  })

  return {
    out: server.stdout,
    shutdown: shutdown
  }
}

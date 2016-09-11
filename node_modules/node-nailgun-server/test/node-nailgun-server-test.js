/* global describe it */
var chai = require('chai')
var util = require('util')
var nailgun = require('../lib/node-nailgun-server')

var expect = chai.expect

describe('node-nailgun-server', function () {
  it('should return shutdown function when created', function () {
    var server = nailgun.createServer()
    expect(util.isFunction(server.shutdown)).to.be.true
  })

  it('should return out object when created', function () {
    var server = nailgun.createServer()
    expect(typeof server === 'object').to.be.true
  })

  it('should give port in callback', function (done) {
    nailgun.createServer({ port: 4242 }, function (port) {
      expect(port).to.be.equal(4242)
      done()
    })
  })

  it('should give default port 2113', function (done) {
    nailgun.createServer(function (port) {
      expect(port).to.be.equal(2113)
      done()
    })
  })

  it('should give random port when configuring port as 0', function (done) {
    nailgun.createServer({ port: 0 }, function (port) {
      expect(port).to.be.above(0)
      done()
    })
  })

  it('should print a start message when started', function (done) {
    var server = nailgun.createServer()
    server.out.on('data', function (data) {
      var started = data.toString().match(/^NGServer started on .+, port \d+./)
      if (started) {
        expect(started).to.not.be.undefined
        done()
      }
    })
  })

  it('should print a shut down message at shutdown', function (done) {
    var server = nailgun.createServer()
    server.out.on('data', function (data) {
      var started = data.toString().match(/^NGServer started on .+, port \d+./)
      if (started) server.shutdown()
      var shutdown = data.toString().match(/^NGServer shut down./)
      if (shutdown) {
        expect(shutdown).to.not.be.undefined
        done()
      }
    })
  })

})

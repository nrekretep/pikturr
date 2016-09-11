'use strict'

var commander = require('commander')
var nailgun = require('./node-nailgun-server')
var pack = require('../package.json')

commander
  .version(pack.version)
  .option('-a, --address [address]', 'the address at which to listen')
  .option('-p, --port [port]', 'the port on which to listen', parseInt)
  .parse(process.argv)

var server = nailgun.createServer(commander)
server.out.pipe(process.stdout)

process.on('SIGINT', server.shutdown)

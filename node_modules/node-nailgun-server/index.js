#!/usr/bin/env node
'use strict'

if (require.main === module) {
  require('./lib/node-nailgun-server-cmd.js')
} else {
  module.exports = require('./lib/node-nailgun-server')
}

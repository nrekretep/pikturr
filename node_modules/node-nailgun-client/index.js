#!/usr/bin/env node
'use strict';

if (require.main === module) {
  require('./lib/node-nailgun-client-cmd.js');
} else {
  module.exports = require('./lib/node-nailgun-client');
}

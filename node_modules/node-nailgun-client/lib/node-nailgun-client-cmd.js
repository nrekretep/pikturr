'use strict';

var commander = require('commander');
var nailgun = require('./node-nailgun-client');
var pack = require('../package.json');

commander
  .version(pack.version)
  .usage('[options] command [args]')
  .option('-s, --server [address]', 'the address of the nailgun server')
  .option('-p, --port [port]', 'the port of the nailgun server', parseInt)
  .parse(process.argv);

var options = {
  host: commander.address,
  port: commander.port,
};

var cmd = commander.args[0];
var args = commander.args.slice(1);

if (!cmd) {
  commander.outputHelp();
  process.exit(0);
}

var nail = nailgun.exec(cmd, args, options);

nail.stdout.pipe(process.stdout);
nail.stderr.pipe(process.stderr);

process.stdin.pipe(nail.stdin);

nail.on('exit', function(code) {
  process.exit(code);
});

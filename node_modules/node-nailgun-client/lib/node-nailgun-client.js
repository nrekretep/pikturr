'use strict';

var stream = require('stream');
var net = require('net');
var path = require('path');
var util = require('util');

var CHUNK_HEADER_LEN = 5;
var NAILGUN_FILESEPARATOR = 'NAILGUN_FILESEPARATOR=' + path.delimiter;
var NAILGUN_PATHSEPARATOR = 'NAILGUN_PATHSEPARATOR=' + path.sep;

var CHUNK_TYPES = {
  STDIN:      '0',
  STDOUT:     '1',
  STDERR:     '2',
  STDIN_EOF:  '.',
  ARG:        'A',
  LONG_ARG:   'L',
  ENV:        'E',
  DIR:        'D',
  CMD:        'C',
  EXIT:       'X',
  SEND_INPUT: 'S',
  HEARTBEAT:  'H',
};

function createChunk(type, buf) {
  var chunk = new Buffer(CHUNK_HEADER_LEN + buf.length);
  chunk.writeUInt32BE(buf.length, 0, true);
  chunk.writeUInt8(type.charCodeAt(0), 4, true);
  buf.copy(chunk, CHUNK_HEADER_LEN);

  return chunk;
};

module.exports.exec = function(cmd, args, options) {
  if (!util.isArray(args)) {
    options = args;
    args = undefined;
  }

  args = args || [];
  options = options || {};
  options.host = options.host || 'localhost';
  options.port = options.port || 2113;
  options.env = options.env || process.env;
  options.cwd = options.cwd || process.cwd();

  var socket = net.createConnection(options.port, options.host);

  var stdin = new stream.Writable();
  var stdout = new stream.Transform();
  var stderr = new stream.Transform();
  var buf = new Buffer(0);
  var exited = false;
  var listeners = {
    exit: [],
  };

  function serverToClientForwarding(chunk, encoding, done) {
    done(null, chunk);
  }

  stdout._transform = serverToClientForwarding;
  stderr._transform = serverToClientForwarding;

  function sendChunk(type, buf) {
    var chunk = createChunk(type, buf);
    return socket.write(chunk);
  };

  function sendText(type, text) {
    var chunk = createChunk(type, new Buffer(text));
    socket.write(chunk);
  }

  function addEventListener(event, callback) {
    listeners[event].push(callback);
  }

  stdin._write = function(chunk, encoding, done) {
    sendChunk(CHUNK_TYPES.STDIN, chunk);
    done();
  };

  stdin.on('finish', function() {
    sendText(CHUNK_TYPES.STDIN_EOF, '');
  });

  function getChunksFromBuffer(bufferData) {
    if (buf.length < CHUNK_HEADER_LEN) { return []; }

    var size = buf.readUInt32BE(0);
    var end = CHUNK_HEADER_LEN + size;

    if (end > buf.length) { return []; }

    var chunk = {};
    chunk.type = String.fromCharCode(buf.readUInt8(4));
    chunk.data = buf.slice(CHUNK_HEADER_LEN, end);

    buf = buf.slice(end);
    return [chunk].concat(getChunksFromBuffer());
  };

  function exit(code) {
    stdout.end();
    stderr.end();
    stdin.end();
    socket.destroy();

    listeners['exit'].forEach(function(listenerCallback) {
      listenerCallback(code);
    });
  }

  function processChunk(chunk) {
    switch (chunk.type) {
      case CHUNK_TYPES.STDOUT: {
        stdout.write(chunk.data);
        break;
      }
      case CHUNK_TYPES.STDERR: {
        stderr.write(chunk.data);
        break;
      }
      case CHUNK_TYPES.EXIT: {
        if (!exited) {
          exited = true;
          exit(chunk.data.toString());
        }
        break;
      }
      default: {
        throw new Error('Unexpected nailgun chunk type: ' + chunk.type);
        break;
      }
    }
  }

  socket.on('data', function(data) {
    buf = Buffer.concat([buf, data]);
    getChunksFromBuffer().forEach(processChunk);
  });

  args.forEach(function(arg) {
    sendText(CHUNK_TYPES.ARG, arg);
  });

  sendText(CHUNK_TYPES.ENV, NAILGUN_FILESEPARATOR);
  sendText(CHUNK_TYPES.ENV, NAILGUN_PATHSEPARATOR);
  for (var v in options.env) {
    sendText(CHUNK_TYPES.ENV, v + '=' + options.env[v]);
  }

  sendText(CHUNK_TYPES.DIR, options.cwd);

  sendText(CHUNK_TYPES.CMD, cmd);

  return {
    stdin: stdin,
    stdout: stdout,
    stderr: stderr,
    on: addEventListener,
  };
};

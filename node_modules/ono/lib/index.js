/**!
 * Ono v1.0.22
 *
 * @link https://github.com/BigstickCarpet/ono
 * @license MIT
 */
'use strict';

var util  = require('util'),
    slice = Array.prototype.slice;

module.exports = create(Error);
module.exports.error = create(Error);
module.exports.eval = create(EvalError);
module.exports.range = create(RangeError);
module.exports.reference = create(ReferenceError);
module.exports.syntax = create(SyntaxError);
module.exports.type = create(TypeError);
module.exports.uri = create(URIError);
module.exports.formatter = util.format;

/**
 * Creates a new {@link ono} function that creates the given Error class.
 *
 * @param {Class} Klass - The Error subclass to create
 * @returns {ono}
 */
function create(Klass) {
  /**
   * @param {Error}   [err]     - The original error, if any
   * @param {object}  [props]   - An object whose properties will be added to the error object
   * @param {string}  [message] - The error message. May contain {@link util#format} placeholders
   * @param {...*}    [params]  - Parameters that map to the `message` placeholders
   * @returns {Error}
   */
  return function ono(err, props, message, params) {
    var formattedMessage, stack;
    var formatter = module.exports.formatter;

    if (typeof(err) === 'string') {
      formattedMessage = formatter.apply(null, arguments);
      err = props = undefined;
    }
    else if (typeof(props) === 'string') {
      formattedMessage = formatter.apply(null, slice.call(arguments, 1));
    }
    else {
      formattedMessage = formatter.apply(null, slice.call(arguments, 2));
    }

    if (!(err instanceof Error)) {
      props = err;
      err = undefined;
    }

    if (err) {
      // The inner-error's message and stack will be added to the new error
      formattedMessage += (formattedMessage ? ' \n' : '') + err.message;
      stack = err.stack;
    }

    var error = new Klass(formattedMessage);
    extendError(error, stack, props);
    return error;
  };
}

/**
 * Extends the given Error object with the given values
 *
 * @param {Error}   error - The error object to extend
 * @param {?string} stack - The stack trace from the original error
 * @param {?object} props - Properties to add to the error object
 */
function extendError(error, stack, props) {
  if (stack) {
    error.stack += ' \n\n' + stack;
  }

  if (props && typeof(props) === 'object') {
    var keys = Object.keys(props);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      error[key] = props[key];
    }
  }

  error.toJSON = errorToJSON;
}

/**
 * Custom JSON serializer for Error objects.
 * Returns all built-in error properties, as well as extended properties.
 *
 * @returns {object}
 */
function errorToJSON() {
  // jshint -W040

  // All Errors have "name" and "message"
  var json = {
    name: this.name,
    message: this.message
  };

  // Append any custom properties that were added
  var keys = Object.keys(this);

  // Also include any vendor-specific Error properties
  keys = keys.concat(['description', 'number', 'fileName', 'lineNumber', 'columnNumber', 'stack']);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var value = this[key];
    if (value !== undefined) {
      json[key] = value;
    }
  }

  return json;
}

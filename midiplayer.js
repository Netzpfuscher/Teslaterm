(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.MidiPlayer = f()}})(function(){var define,module,exports;return (function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],2:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (isArrayBuffer(value)) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  return fromObject(value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0)
      }
      return fromArrayLike(obj)
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (isArrayBufferView(string) || isArrayBuffer(string)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : new Buffer(val, encoding)
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer (obj) {
  return obj instanceof ArrayBuffer ||
    (obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' &&
      typeof obj.byteLength === 'number')
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView (obj) {
  return (typeof ArrayBuffer.isView === 'function') && ArrayBuffer.isView(obj)
}

function numberIsNaN (obj) {
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
'use strict';

/**
 * Constants used in player.
 */
var Constants = {
	VERSION: '2.0.3',
	NOTES: [],
	CIRCLE_OF_FOURTHS: ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb', 'Bbb', 'Ebb', 'Abb'],
	CIRCLE_OF_FIFTHS: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'E#']
};

// Builds notes object for reference against binary values.
var allNotes = [['C'], ['C#', 'Db'], ['D'], ['D#', 'Eb'], ['E'], ['F'], ['F#', 'Gb'], ['G'], ['G#', 'Ab'], ['A'], ['A#', 'Bb'], ['B']];
var counter = 0;

// All available octaves.

var _loop = function _loop(i) {
	allNotes.forEach(function (noteGroup) {
		noteGroup.forEach(function (note) {
			return Constants.NOTES[counter] = note + i;
		});
		counter++;
	});
};

for (var i = -1; i <= 9; i++) {
	_loop(i);
}

exports.Constants = Constants;

},{}],5:[function(require,module,exports){
"use strict";

var Player = require("./player");
var Utils = require("./utils");
var Constants = require("./constants");

module.exports = {
    Player: Player.Player,
    Utils: Utils.Utils,
    Constants: Constants.Constants
};

},{"./constants":4,"./player":6,"./utils":8}],6:[function(require,module,exports){
"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Utils = require("./utils").Utils;
var Track = require("./track").Track;

// Polyfill Uint8Array.forEach: Doesn't exist on Safari <10
if (!Uint8Array.prototype.forEach) {
	Object.defineProperty(Uint8Array.prototype, 'forEach', {
		value: Array.prototype.forEach
	});
}

/**
 * Main player class.  Contains methods to load files, start, stop.
 * @param {function} - Callback to fire for each MIDI event.  Can also be added with on('midiEvent', fn)
 * @param {array} - Array buffer of MIDI file (optional).
 */

var Player = function () {
	function Player(eventHandler, buffer) {
		_classCallCheck(this, Player);

		this.sampleRate = 5; // milliseconds
		this.startTime = 0;
		this.buffer = buffer || null;
		this.division;
		this.format;
		this.setIntervalId = false;
		this.tracks = [];
		this.instruments = [];
		this.defaultTempo = 120;
		this.tempo = null;
		this.startTick = 0;
		this.tick = 0;
		this.lastTick = null;
		this.inLoop = false;
		this.totalTicks = 0;
		this.events = [];
		this.totalEvents = 0;
		this.eventListeners = {};

		if (typeof eventHandler === 'function') this.on('midiEvent', eventHandler);
	}

	/**
  * Load a file into the player (Node.js only).
  * @param {string} path - Path of file.
  * @return {Player}
  */


	_createClass(Player, [{
		key: "loadFile",
		value: function loadFile(path) {
			var fs = require('fs');
			this.buffer = fs.readFileSync(path);
			return this.fileLoaded();
		}

		/**
   * Load an array buffer into the player.
   * @param {array} arrayBuffer - Array buffer of file to be loaded.
   * @return {Player}
   */

	}, {
		key: "loadArrayBuffer",
		value: function loadArrayBuffer(arrayBuffer) {
			this.buffer = new Uint8Array(arrayBuffer);
			return this.fileLoaded();
		}

		/**
   * Load a data URI into the player.
   * @param {string} dataUri - Data URI to be loaded.
   * @return {Player}
   */

	}, {
		key: "loadDataUri",
		value: function loadDataUri(dataUri) {
			// convert base64 to raw binary data held in a string.
			// doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
			var byteString = Utils.atob(dataUri.split(',')[1]);

			// write the bytes of the string to an ArrayBuffer
			var ia = new Uint8Array(byteString.length);
			for (var i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}

			this.buffer = ia;
			return this.fileLoaded();
		}

		/**
   * Get filesize of loaded file in number of bytes.
   * @return {number} - The filesize.
   */

	}, {
		key: "getFilesize",
		value: function getFilesize() {
			return this.buffer ? this.buffer.length : 0;
		}

		/**
   * Sets default tempo, parses file for necessary information, and does a dry run to calculate total length.
   * Populates this.events & this.totalTicks.
   * @return {Player}
   */

	}, {
		key: "fileLoaded",
		value: function fileLoaded() {
			if (!this.validate()) throw 'Invalid MIDI file; should start with MThd';
			return this.setTempo(this.defaultTempo).getDivision().getFormat().getTracks().dryRun();
		}

		/**
   * Validates file using simple means - first four bytes should == MThd.
   * @return {boolean}
   */

	}, {
		key: "validate",
		value: function validate() {
			return Utils.bytesToLetters(this.buffer.subarray(0, 4)) === 'MThd';
		}

		/**
   * Gets MIDI file format for loaded file.
   * @return {Player}
   */

	}, {
		key: "getFormat",
		value: function getFormat() {
			/*
   MIDI files come in 3 variations:
   Format 0 which contain a single track
   Format 1 which contain one or more simultaneous tracks
   (ie all tracks are to be played simultaneously).
   Format 2 which contain one or more independant tracks
   (ie each track is to be played independantly of the others).
   return Utils.bytesToNumber(this.buffer.subarray(8, 10));
   */

			this.format = Utils.bytesToNumber(this.buffer.subarray(8, 10));
			return this;
		}

		/**
   * Parses out tracks, places them in this.tracks and initializes this.pointers
   * @return {Player}
   */

	}, {
		key: "getTracks",
		value: function getTracks() {
			this.tracks = [];
			var trackOffset = 0;
			while (trackOffset < this.buffer.length) {
				if (Utils.bytesToLetters(this.buffer.subarray(trackOffset, trackOffset + 4)) == 'MTrk') {
					var trackLength = Utils.bytesToNumber(this.buffer.subarray(trackOffset + 4, trackOffset + 8));
					this.tracks.push(new Track(this.tracks.length, this.buffer.subarray(trackOffset + 8, trackOffset + 8 + trackLength)));
				}

				trackOffset += Utils.bytesToNumber(this.buffer.subarray(trackOffset + 4, trackOffset + 8)) + 8;
			}
			return this;
		}

		/**
   * Enables a track for playing.
   * @param {number} trackNumber - Track number
   * @return {Player}
   */

	}, {
		key: "enableTrack",
		value: function enableTrack(trackNumber) {
			this.tracks[trackNumber - 1].enable();
			return this;
		}

		/**
   * Disables a track for playing.
   * @param {number} - Track number
   * @return {Player}
   */

	}, {
		key: "disableTrack",
		value: function disableTrack(trackNumber) {
			this.tracks[trackNumber - 1].disable();
			return this;
		}

		/**
   * Gets quarter note division of loaded MIDI file.
   * @return {Player}
   */

	}, {
		key: "getDivision",
		value: function getDivision() {
			this.division = Utils.bytesToNumber(this.buffer.subarray(12, 14));
			return this;
		}

		/**
   * The main play loop.
   * @param {boolean} - Indicates whether or not this is being called simply for parsing purposes.  Disregards timing if so.
   * @return {undefined}
   */

	}, {
		key: "playLoop",
		value: function playLoop(dryRun) {
			if (!this.inLoop) {
				this.inLoop = true;
				this.tick = this.getCurrentTick();

				this.tracks.forEach(function (track) {
					// Handle next event
					if (!dryRun && this.endOfFile()) {
						//console.log('end of file')
						this.triggerPlayerEvent('endOfFile');
						this.stop();
					} else {
						var event = track.handleEvent(this.tick, dryRun);

						if (dryRun && event) {
							if (event.hasOwnProperty('name') && event.name === 'Set Tempo') {
								// Grab tempo if available.
								this.setTempo(event.data);
							}
							if (event.hasOwnProperty('name') && event.name === 'Program Change') {
								if (!this.instruments.includes(event.value)) {
									this.instruments.push(event.value);
								}
							}
						} else if (event) this.emitEvent(event);
					}
				}, this);

				if (!dryRun) this.triggerPlayerEvent('playing', { tick: this.tick });
				this.inLoop = false;
			}
		}

		/**
   * Setter for tempo.
   * @param {number} - Tempo in bpm (defaults to 120)
   */

	}, {
		key: "setTempo",
		value: function setTempo(tempo) {
			this.tempo = tempo;
			return this;
		}

		/**
   * Setter for startTime.
   * @param {number} - UTC timestamp
   */

	}, {
		key: "setStartTime",
		value: function setStartTime(startTime) {
			this.startTime = startTime;
		}

		/**
   * Start playing loaded MIDI file if not already playing.
   * @return {Player}
   */

	}, {
		key: "play",
		value: function play() {
			if (this.isPlaying()) throw 'Already playing...';

			// Initialize
			if (!this.startTime) this.startTime = new Date().getTime();

			// Start play loop
			//window.requestAnimationFrame(this.playLoop.bind(this));
			this.setIntervalId = setInterval(this.playLoop.bind(this), this.sampleRate);

			return this;
		}

		/**
   * Pauses playback if playing.
   * @return {Player}
   */

	}, {
		key: "pause",
		value: function pause() {
			clearInterval(this.setIntervalId);
			this.setIntervalId = false;
			this.startTick = this.tick;
			this.startTime = 0;
			return this;
		}

		/**
   * Stops playback if playing.
   * @return {Player}
   */

	}, {
		key: "stop",
		value: function stop() {
			clearInterval(this.setIntervalId);
			this.setIntervalId = false;
			this.startTick = 0;
			this.startTime = 0;
			this.resetTracks();
			return this;
		}

		/**
   * Skips player pointer to specified tick.
   * @param {number} - Tick to skip to.
   * @return {Player}
   */

	}, {
		key: "skipToTick",
		value: function skipToTick(tick) {
			this.stop();
			this.startTick = tick;

			// Need to set track event indexes to the nearest possible event to the specified tick.
			this.tracks.forEach(function (track) {
				track.setEventIndexByTick(tick);
			});
			return this;
		}

		/**
   * Skips player pointer to specified percentage.
   * @param {number} - Percent value in integer format.
   * @return {Player}
   */

	}, {
		key: "skipToPercent",
		value: function skipToPercent(percent) {
			if (percent < 0 || percent > 100) throw "Percent must be number between 1 and 100.";
			this.skipToTick(Math.round(percent / 100 * this.totalTicks));
			return this;
		}

		/**
   * Skips player pointer to specified seconds.
   * @param {number} - Seconds to skip to.
   * @return {Player}
   */

	}, {
		key: "skipToSeconds",
		value: function skipToSeconds(seconds) {
			var songTime = this.getSongTime();
			if (seconds < 0 || seconds > songTime) throw seconds + " seconds not within song time of " + songTime;
			this.skipToPercent(seconds / songTime * 100);
			return this;
		}

		/**
   * Checks if player is playing
   * @return {boolean}
   */

	}, {
		key: "isPlaying",
		value: function isPlaying() {
			return this.setIntervalId > 0 || _typeof(this.setIntervalId) === 'object';
		}

		/**
   * Plays the loaded MIDI file without regard for timing and saves events in this.events.  Essentially used as a parser.
   * @return {Player}
   */

	}, {
		key: "dryRun",
		value: function dryRun() {
			// Reset tracks first
			this.resetTracks();
			while (!this.endOfFile()) {
				this.playLoop(true);
			}this.events = this.getEvents();
			this.totalEvents = this.getTotalEvents();
			this.totalTicks = this.getTotalTicks();
			this.startTick = 0;
			this.startTime = 0;

			// Leave tracks in pristine condish
			this.resetTracks();

			//console.log('Song time: ' + this.getSongTime() + ' seconds / ' + this.totalTicks + ' ticks.');

			this.triggerPlayerEvent('fileLoaded', this);
			return this;
		}

		/**
   * Resets play pointers for all tracks.
   * @return {Player}
   */

	}, {
		key: "resetTracks",
		value: function resetTracks() {
			this.tracks.forEach(function (track) {
				return track.reset();
			});
			return this;
		}

		/**
   * Gets an array of events grouped by track.
   * @return {array}
   */

	}, {
		key: "getEvents",
		value: function getEvents() {
			return this.tracks.map(function (track) {
				return track.events;
			});
		}

		/**
   * Gets total number of ticks in the loaded MIDI file.
   * @return {number}
   */

	}, {
		key: "getTotalTicks",
		value: function getTotalTicks() {
			return Math.max.apply(null, this.tracks.map(function (track) {
				return track.delta;
			}));
		}

		/**
   * Gets total number of events in the loaded MIDI file.
   * @return {number}
   */

	}, {
		key: "getTotalEvents",
		value: function getTotalEvents() {
			return this.tracks.reduce(function (a, b) {
				return { events: { length: a.events.length + b.events.length } };
			}, { events: { length: 0 } }).events.length;
		}

		/**
   * Gets song duration in seconds.
   * @return {number}
   */

	}, {
		key: "getSongTime",
		value: function getSongTime() {
			return this.totalTicks / this.division / this.tempo * 60;
		}

		/**
   * Gets remaining number of seconds in playback.
   * @return {number}
   */

	}, {
		key: "getSongTimeRemaining",
		value: function getSongTimeRemaining() {
			return Math.round((this.totalTicks - this.tick) / this.division / this.tempo * 60);
		}

		/**
   * Gets remaining percent of playback.
   * @return {number}
   */

	}, {
		key: "getSongPercentRemaining",
		value: function getSongPercentRemaining() {
			return Math.round(this.getSongTimeRemaining() / this.getSongTime() * 100);
		}

		/**
   * Number of bytes processed in the loaded MIDI file.
   * @return {number}
   */

	}, {
		key: "bytesProcessed",
		value: function bytesProcessed() {
			// Currently assume header chunk is strictly 14 bytes
			return 14 + this.tracks.length * 8 + this.tracks.reduce(function (a, b) {
				return { pointer: a.pointer + b.pointer };
			}, { pointer: 0 }).pointer;
		}

		/**
   * Number of events played up to this point.
   * @return {number}
   */

	}, {
		key: "eventsPlayed",
		value: function eventsPlayed() {
			return this.tracks.reduce(function (a, b) {
				return { eventIndex: a.eventIndex + b.eventIndex };
			}, { eventIndex: 0 }).eventIndex;
		}

		/**
   * Determines if the player pointer has reached the end of the loaded MIDI file.
   * Used in two ways:
   * 1. If playing result is based on loaded JSON events.
   * 2. If parsing (dryRun) it's based on the actual buffer length vs bytes processed.
   * @return {boolean}
   */

	}, {
		key: "endOfFile",
		value: function endOfFile() {
			if (this.isPlaying()) {
				return this.eventsPlayed() == this.totalEvents;
			}

			return this.bytesProcessed() == this.buffer.length;
		}

		/**
   * Gets the current tick number in playback.
   * @return {number}
   */

	}, {
		key: "getCurrentTick",
		value: function getCurrentTick() {
			return Math.round((new Date().getTime() - this.startTime) / 1000 * (this.division * (this.tempo / 60))) + this.startTick;
		}

		/**
   * Sends MIDI event out to listener.
   * @param {object}
   * @return {Player}
   */

	}, {
		key: "emitEvent",
		value: function emitEvent(event) {
			this.triggerPlayerEvent('midiEvent', event);
			return this;
		}

		/**
   * Subscribes events to listeners
   * @param {string} - Name of event to subscribe to.
   * @param {function} - Callback to fire when event is broadcast.
   * @return {Player}
   */

	}, {
		key: "on",
		value: function on(playerEvent, fn) {
			if (!this.eventListeners.hasOwnProperty(playerEvent)) this.eventListeners[playerEvent] = [];
			this.eventListeners[playerEvent].push(fn);
			return this;
		}

		/**
   * Broadcasts event to trigger subscribed callbacks.
   * @param {string} - Name of event.
   * @param {object} - Data to be passed to subscriber callback.
   * @return {Player}
   */

	}, {
		key: "triggerPlayerEvent",
		value: function triggerPlayerEvent(playerEvent, data) {
			if (this.eventListeners.hasOwnProperty(playerEvent)) this.eventListeners[playerEvent].forEach(function (fn) {
				return fn(data || {});
			});
			return this;
		}
	}]);

	return Player;
}();

exports.Player = Player;

},{"./track":7,"./utils":8,"fs":"fs"}],7:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Constants = require("./constants").Constants;
var Utils = require("./utils").Utils;

/**
 * Class representing a track.  Contains methods for parsing events and keeping track of pointer.
 */

var Track = function () {
	function Track(index, data) {
		_classCallCheck(this, Track);

		this.enabled = true;
		this.eventIndex = 0;
		this.pointer = 0;
		this.lastTick = 0;
		this.lastStatus = null;
		this.index = index;
		this.data = data;
		this.delta = 0;
		this.runningDelta = 0;
		this.events = [];
	}

	/**
  * Resets all stateful track informaion used during playback.
  * @return {Track}
  */


	_createClass(Track, [{
		key: "reset",
		value: function reset() {
			this.enabled = true;
			this.eventIndex = 0;
			this.pointer = 0;
			this.lastTick = 0;
			this.lastStatus = null;
			this.delta = 0;
			this.runningDelta = 0;
			return this;
		}

		/**
   * Sets this track to be enabled during playback.
   * @return {Track}
   */

	}, {
		key: "enable",
		value: function enable() {
			this.enabled = true;
			return this;
		}

		/**
   * Sets this track to be disabled during playback.
   * @return {Track}
   */

	}, {
		key: "disable",
		value: function disable() {
			this.enabled = false;
			return this;
		}

		/**
   * Sets the track event index to the nearest event to the given tick.
   * @param {number} tick
   * @return {Track}
   */

	}, {
		key: "setEventIndexByTick",
		value: function setEventIndexByTick(tick) {
			tick = tick || 0;

			for (var i in this.events) {
				if (this.events[i].tick >= tick) {
					this.eventIndex = i;
					return this;
				}
			}
		}

		/**
   * Gets byte located at pointer position.
   * @return {number}
   */

	}, {
		key: "getCurrentByte",
		value: function getCurrentByte() {
			return this.data[this.pointer];
		}

		/**
   * Gets count of delta bytes and current pointer position.
   * @return {number}
   */

	}, {
		key: "getDeltaByteCount",
		value: function getDeltaByteCount() {
			// Get byte count of delta VLV
			// http://www.ccarh.org/courses/253/handout/vlv/
			// If byte is greater or equal to 80h (128 decimal) then the next byte
			// is also part of the VLV,
			// else byte is the last byte in a VLV.
			var currentByte = this.getCurrentByte();
			var byteCount = 1;

			while (currentByte >= 128) {
				currentByte = this.data[this.pointer + byteCount];
				byteCount++;
			}

			return byteCount;
		}

		/**
   * Get delta value at current pointer position.
   * @return {number}
   */

	}, {
		key: "getDelta",
		value: function getDelta() {
			return Utils.readVarInt(this.data.subarray(this.pointer, this.pointer + this.getDeltaByteCount()));
		}

		/**
   * Handles event within a given track starting at specified index
   * @param {number} currentTick
   * @param {boolean} dryRun - If true events will be parsed and returned regardless of time.
   */

	}, {
		key: "handleEvent",
		value: function handleEvent(currentTick, dryRun) {
			dryRun = dryRun || false;

			if (dryRun) {
				var elapsedTicks = currentTick - this.lastTick;
				var delta = this.getDelta();
				var eventReady = elapsedTicks >= delta;

				if (this.pointer < this.data.length && (dryRun || eventReady)) {
					var _event = this.parseEvent();
					if (this.enabled) return _event;
					// Recursively call this function for each event ahead that has 0 delta time?
				}
			} else {
				// Let's actually play the MIDI from the generated JSON events created by the dry run.
				if (this.events[this.eventIndex] && this.events[this.eventIndex].tick <= currentTick) {
					this.eventIndex++;
					if (this.enabled) return this.events[this.eventIndex - 1];
				}
			}

			return null;
		}

		/**
   * Get string data from event.
   * @param {number} eventStartIndex
   * @return {string}
   */

	}, {
		key: "getStringData",
		value: function getStringData(eventStartIndex) {
			var currentByte = this.pointer;
			var byteCount = 1;
			var length = Utils.readVarInt(this.data.subarray(eventStartIndex + 2, eventStartIndex + 2 + byteCount));
			var stringLength = length;

			return Utils.bytesToLetters(this.data.subarray(eventStartIndex + byteCount + 2, eventStartIndex + byteCount + length + 2));
		}

		/**
   * Parses event into JSON and advances pointer for the track
   * @return {object}
   */

	}, {
		key: "parseEvent",
		value: function parseEvent() {
			var eventStartIndex = this.pointer + this.getDeltaByteCount();
			var eventJson = {};
			eventJson.bytes_buf = [0x00,0x00,0x00];
			var deltaByteCount = this.getDeltaByteCount();
			eventJson.track = this.index + 1;
			eventJson.delta = this.getDelta();
			this.lastTick = this.lastTick + eventJson.delta;
			this.runningDelta += eventJson.delta;
			eventJson.tick = this.runningDelta;
			eventJson.byteIndex = this.pointer;

			//eventJson.raw = event;
			if (this.data[eventStartIndex] == 0xff) {
				// Meta Event

				// If this is a meta event we should emit the data and immediately move to the next event
				// otherwise if we let it run through the next cycle a slight delay will accumulate if multiple tracks
				// are being played simultaneously

				switch (this.data[eventStartIndex + 1]) {
					case 0x00:
						// Sequence Number
						eventJson.name = 'Sequence Number';
						break;
					case 0x01:
						// Text Event
						eventJson.name = 'Text Event';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x02:
						// Copyright Notice
						eventJson.name = 'Copyright Notice';
						break;
					case 0x03:
						// Sequence/Track Name
						eventJson.name = 'Sequence/Track Name';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x04:
						// Instrument Name
						eventJson.name = 'Instrument Name';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x05:
						// Lyric
						eventJson.name = 'Lyric';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x06:
						// Marker
						eventJson.name = 'Marker';
						break;
					case 0x07:
						// Cue Point
						eventJson.name = 'Cue Point';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x09:
						// Device Name
						eventJson.name = 'Device Name';
						eventJson.string = this.getStringData(eventStartIndex);
						break;
					case 0x20:
						// MIDI Channel Prefix
						eventJson.name = 'MIDI Channel Prefix';
						break;
					case 0x21:
						// MIDI Port
						eventJson.name = 'MIDI Port';
						eventJson.data = Utils.bytesToNumber([this.data[eventStartIndex + 3]]);
						break;
					case 0x2F:
						// End of Track
						eventJson.name = 'End of Track';
						break;
					case 0x51:
						// Set Tempo
						eventJson.name = 'Set Tempo';
						eventJson.data = Math.round(60000000 / Utils.bytesToNumber(this.data.subarray(eventStartIndex + 3, eventStartIndex + 6)));
						this.tempo = eventJson.data;
						break;
					case 0x54:
						// SMTPE Offset
						eventJson.name = 'SMTPE Offset';
						break;
					case 0x58:
						// Time Signature
						// FF 58 04 nn dd cc bb
						eventJson.name = 'Time Signature';
						eventJson.data = this.data.subarray(eventStartIndex + 3, eventStartIndex + 7);
						eventJson.timeSignature = "" + eventJson.data[0] + "/" + Math.pow(eventJson.data[1], 2);
						break;
					case 0x59:
						// Key Signature
						// FF 59 02 sf mi
						eventJson.name = 'Key Signature';
						eventJson.data = this.data.subarray(eventStartIndex + 3, eventStartIndex + 5);

						if (eventJson.data[0] >= 0) {
							eventJson.keySignature = Constants.CIRCLE_OF_FIFTHS[eventJson.data[0]];
						} else if (eventJson.data[0] < 0) {
							eventJson.keySignature = Constants.CIRCLE_OF_FOURTHS[Math.abs(eventJson.data[0])];
						}

						if (eventJson.data[1] == 0) {
							eventJson.keySignature += " Major";
						} else if (eventJson.data[1] == 1) {
							eventJson.keySignature += " Minor";
						}

						break;
					case 0x7F:
						// Sequencer-Specific Meta-event
						eventJson.name = 'Sequencer-Specific Meta-event';
						break;
					default:
						eventJson.name = 'Unknown: ' + this.data[eventStartIndex + 1].toString(16);
						break;
				}

				var length = this.data[this.pointer + deltaByteCount + 2];
				// Some meta events will have vlv that needs to be handled

				this.pointer += deltaByteCount + 3 + length;
			} else if (this.data[eventStartIndex] == 0xf0) {
				// Sysex
				eventJson.name = 'Sysex';
				var length = this.data[this.pointer + deltaByteCount + 1];
				this.pointer += deltaByteCount + 2 + length;
			} else {
				// Voice event
				if (this.data[eventStartIndex] < 0x80) {
					// Running status
					eventJson.running = true;
					eventJson.noteNumber = this.data[eventStartIndex];
					eventJson.noteName = Constants.NOTES[this.data[eventStartIndex]];
					eventJson.velocity = this.data[eventStartIndex + 1];

					if (this.lastStatus <= 0x8f) {
						eventJson.name = 'Note off';
						eventJson.channel = this.lastStatus - 0x80 + 1;
					} else if (this.lastStatus <= 0x9f) {
						eventJson.name = 'Note on';
						eventJson.channel = this.lastStatus - 0x90 + 1;
					}

					this.pointer += deltaByteCount + 2;
				} else {
					this.lastStatus = this.data[eventStartIndex];

					if (this.data[eventStartIndex] <= 0x8f) {
						// Note off
						eventJson.name = 'Note off';
						eventJson.channel = this.lastStatus - 0x80 + 1;
						eventJson.noteNumber = this.data[eventStartIndex + 1];
						eventJson.noteName = Constants.NOTES[this.data[eventStartIndex + 1]];
						eventJson.velocity = Math.round(this.data[eventStartIndex + 2] / 127 * 100);
						eventJson.bytes_buf[0] = this.lastStatus;
						eventJson.bytes_buf[1] = this.data[eventStartIndex + 1];
						eventJson.bytes_buf[2] = this.data[eventStartIndex + 2];
						this.pointer += deltaByteCount + 3;
					} else if (this.data[eventStartIndex] <= 0x9f) {
						// Note on
						eventJson.name = 'Note on';
						eventJson.channel = this.lastStatus - 0x90 + 1;
						eventJson.noteNumber = this.data[eventStartIndex + 1];
						eventJson.noteName = Constants.NOTES[this.data[eventStartIndex + 1]];
						eventJson.velocity = Math.round(this.data[eventStartIndex + 2] / 127 * 100);
						eventJson.bytes_buf[0] = this.lastStatus;
						eventJson.bytes_buf[1] = this.data[eventStartIndex + 1];
						eventJson.bytes_buf[2] = this.data[eventStartIndex + 2];
						this.pointer += deltaByteCount + 3;
					} else if (this.data[eventStartIndex] <= 0xaf) {
						// Polyphonic Key Pressure
						eventJson.name = 'Polyphonic Key Pressure';
						eventJson.channel = this.lastStatus - 0xa0 + 1;
						eventJson.note = Constants.NOTES[this.data[eventStartIndex + 1]];
						eventJson.pressure = event[2];
						eventJson.bytes_buf[0] = this.lastStatus;
						eventJson.bytes_buf[1] = this.data[eventStartIndex + 1];
						eventJson.bytes_buf[2] = this.data[eventStartIndex + 2];
						this.pointer += deltaByteCount + 3;
					} else if (this.data[eventStartIndex] <= 0xbf) {
						// Controller Change
						eventJson.name = 'Controller Change';
						eventJson.channel = this.lastStatus - 0xb0 + 1;
						eventJson.number = this.data[eventStartIndex + 1];
						eventJson.value = this.data[eventStartIndex + 2];
						eventJson.bytes_buf[0] = this.lastStatus;
						eventJson.bytes_buf[1] = this.data[eventStartIndex + 1];
						eventJson.bytes_buf[2] = this.data[eventStartIndex + 2];
						this.pointer += deltaByteCount + 3;
					} else if (this.data[eventStartIndex] <= 0xcf) {
						// Program Change
						eventJson.name = 'Program Change';
						eventJson.channel = this.lastStatus - 0xc0 + 1;
						eventJson.value = this.data[eventStartIndex + 1];
						eventJson.bytes_buf[0] = this.lastStatus;
						eventJson.bytes_buf[1] = this.data[eventStartIndex + 1];
						this.pointer += deltaByteCount + 2;
					} else if (this.data[eventStartIndex] <= 0xdf) {
						// Channel Key Pressure
						eventJson.name = 'Channel Key Pressure';
						eventJson.channel = this.lastStatus - 0xd0 + 1;
						eventJson.bytes_buf[0] = this.lastStatus;
						eventJson.bytes_buf[1] = this.data[eventStartIndex + 1];
						this.pointer += deltaByteCount + 2;
					} else if (this.data[eventStartIndex] <= 0xef) {
						// Pitch Bend
						eventJson.name = 'Pitch Bend';
						eventJson.channel = this.lastStatus - 0xe0 + 1;
						eventJson.bytes_buf[0] = this.lastStatus;
						eventJson.bytes_buf[1] = this.data[eventStartIndex + 1];
						eventJson.bytes_buf[2] = this.data[eventStartIndex + 2];
						this.pointer += deltaByteCount + 3;
					} else {
						eventJson.name = 'Unknown.  Pointer: ' + this.pointer.toString() + ' ' + eventStartIndex.toString() + ' ' + this.data.length;
					}
				}
			}

			this.delta += eventJson.delta;
			this.events.push(eventJson);

			return eventJson;
			//return this.data;
		}

		/**
   * Returns true if pointer has reached the end of the track.
   * @param {boolean}
   */

	}, {
		key: "endOfTrack",
		value: function endOfTrack() {
			if (this.data[this.pointer + 1] == 0xff && this.data[this.pointer + 2] == 0x2f && this.data[this.pointer + 3] == 0x00) {
				return true;
			}

			return false;
		}
	}]);

	return Track;
}();

module.exports.Track = Track;

},{"./constants":4,"./utils":8}],8:[function(require,module,exports){
(function (Buffer){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Contains misc static utility methods.
 */
var Utils = function () {
	function Utils() {
		_classCallCheck(this, Utils);
	}

	_createClass(Utils, null, [{
		key: 'byteToHex',


		/**
   * Converts a single byte to a hex string.
   * @param {number} byte
   * @return {string}
   */
		value: function byteToHex(byte) {
			// Ensure hex string always has two chars
			return ('0' + byte.toString(16)).slice(-2);
		}

		/**
   * Converts an array of bytes to a hex string.
   * @param {array} byteArray
   * @return {string}
   */

	}, {
		key: 'bytesToHex',
		value: function bytesToHex(byteArray) {
			var hex = [];
			byteArray.forEach(function (byte) {
				return hex.push(Utils.byteToHex(byte));
			});
			return hex.join('');
		}

		/**
   * Converts a hex string to a number.
   * @param {string} hexString
   * @return {number}
   */

	}, {
		key: 'hexToNumber',
		value: function hexToNumber(hexString) {
			return parseInt(hexString, 16);
		}

		/**
   * Converts an array of bytes to a number.
   * @param {array} byteArray
   * @return {number}
   */

	}, {
		key: 'bytesToNumber',
		value: function bytesToNumber(byteArray) {
			return Utils.hexToNumber(Utils.bytesToHex(byteArray));
		}

		/**
   * Converts an array of bytes to letters.
   * @param {array} byteArray
   * @return {string}
   */

	}, {
		key: 'bytesToLetters',
		value: function bytesToLetters(byteArray) {
			var letters = [];
			byteArray.forEach(function (byte) {
				return letters.push(String.fromCharCode(byte));
			});
			return letters.join('');
		}

		/**
   * Converts a decimal to it's binary representation.
   * @param {number} dec
   * @return {string}
   */

	}, {
		key: 'decToBinary',
		value: function decToBinary(dec) {
			return (dec >>> 0).toString(2);
		}

		/**
   * Reads a variable length value.
   * @param {array} byteArray
   * @return {number}
   */

	}, {
		key: 'readVarInt',
		value: function readVarInt(byteArray) {
			var result = 0;
			byteArray.forEach(function (number) {
				var b = number;
				if (b & 0x80) {
					result += b & 0x7f;
					result <<= 7;
				} else {
					/* b is the last byte */
					result += b;
				}
			});

			return result;
		}

		/**
   * Decodes base-64 encoded string
   * @param {string} string
   * @return {string}
   */

	}, {
		key: 'atob',
		value: function (_atob) {
			function atob(_x) {
				return _atob.apply(this, arguments);
			}

			atob.toString = function () {
				return _atob.toString();
			};

			return atob;
		}(function (string) {
			if (typeof atob === 'function') return atob(string);
			return new Buffer(string, 'base64').toString('binary');
		})
	}]);

	return Utils;
}();

exports.Utils = Utils;

}).call(this,require("buffer").Buffer)

},{"buffer":2}]},{},[5])(5)
});


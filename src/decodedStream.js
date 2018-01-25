var Duplex = require('readable-stream').Duplex
var inherits = require('inherits')
var MediaElementWrapper = require('mediasource')
var Buffer = require('safe-buffer').Buffer
var ebml = require('ebml')

inherits(DecodedStream, Duplex)

function DecodedStream (opts) {
  var self = this
  if (!(self instanceof DecodedStream)) return new DecodedStream(opts)

  Duplex.call(self, opts)

  opts = opts || {}
  self._mimeType = opts.mimeType || 'video/webm; codecs="opus,vp8"'
  self.videoElement = opts.videoElement || document.createElement('video')

  self._headerSize = null
  self._header = null

  self._timecodeOffset = null

  self._parseSize = 32
  self._parse = self._parseHeaderSize
  self._buffer = []
  self._bufferSize = 0

  self._wrapper = new MediaElementWrapper(self.videoElement)

  self.pipe(self._wrapper.createWriteStream(self._mimeType))
}

DecodedStream.prototype._write = function (chunk, enc, next) {
  var self = this
  self._bufferSize += chunk.length
  self._buffer.push(chunk)

  while (self._bufferSize >= self._parseSize) { // while we have enough data to parse...
        // concatenate buffer
    var concatBuffer = Buffer.concat(self._buffer)

    self._bufferSize -= self._parseSize // reduce the buffer size by amount taken
    self._buffer = self._bufferSize > 0 ? [concatBuffer.slice(self._parseSize)] : [] // update the buffer with leftover (if any)

    self._parse(concatBuffer.slice(0, self._parseSize)) // parse the taken data
  }

  next(null)
}

DecodedStream.prototype._read = function () {}

DecodedStream.prototype._parseHeaderSize = function (chunk) {
  var self = this
  self._headerSize = self._headerSize || chunk.readUInt32BE(0) // headerSize is the same always

  self._parse = self._parseHeader
  self._parseSize = self._headerSize
}

DecodedStream.prototype._parseHeader = function (chunk) {
  var self = this
  if (!self._header) {
    self._header = chunk // only write the header once
    self.push(chunk)
  }

  self._parse = self._parseClusterSize
  self._parseSize = 32
}

DecodedStream.prototype._parseClusterSize = function (chunk) {
  var self = this
  self._parse = self._parseCluster
  self._parseSize = chunk.readUInt32BE(0)
}

DecodedStream.prototype._parseCluster = function (chunk) {
  var self = this
  // HACK: MSE is broken and doesn't handle gaps in timestamps correctly
  // We just need to read the first timecode we get and shift the video time

  if (self._timecodeOffset == null) {
    var dec = new ebml.Decoder()

    dec.on('data', function (block) {
      if (self._timecodeOffset != null) return

      if (block[1].name === 'Timecode') {
        self._timecodeOffset = block[1].data.readUIntBE(0, block[1].data.length) // timecodes are variable length
        self.videoElement.currentTime = self._timecodeOffset / 1000
      }
    })

    dec.write(chunk)
    dec.end()
  }

  self.push(chunk)

  self._parse = self._parseHeaderSize
  self._parseSize = 32
}

module.exports = DecodedStream

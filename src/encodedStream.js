var Readable = require('readable-stream').Readable
var inherits = require('inherits')
var recorder = require('media-recorder-stream')
var clusters = require('webm-cluster-stream')
var Buffer = require('safe-buffer').Buffer

inherits(EncodedStream, Readable)

function EncodedStream (mediaStream, opts) {
  var self = this
  if (!(self instanceof EncodedStream)) return new EncodedStream(mediaStream, opts)

  Readable.call(self, opts)

  opts = opts || {}
  opts.interval = opts.interval || 100
  opts.mimeType = opts.mimeType || 'video/webm; codecs="opus,vp8"'

  self._headerBuffer = null

  var recordStream = recorder(mediaStream, opts)
  var cl = clusters()

  recordStream.pipe(cl)

  cl.once('data', function (header) {
    self.push(self._packageChunk(header, Buffer.alloc(0)))
    cl.on('data', function (cluster) {
      self.push(self._packageChunk(header, cluster))
    })
  })
}

EncodedStream.prototype._read = function () {}

// Package the header with every cluster so that consumers can join the stream at any time
// Also seperates each packaged chunk
EncodedStream.prototype._packageChunk = function (header, cluster) {
  var self = this
  if (!self._headerBuffer) {
    var headerSizeBuffer = Buffer.alloc(4) // first 32 bits indicate size of header
    headerSizeBuffer.writeUInt32BE(header.length)

    // store for later (it is the same for every cluster)
    self._headerBuffer = Buffer.concat([headerSizeBuffer, header])
  }

  var clusterSizeBuffer = Buffer.alloc(4) // second 32 bits indicate size of cluster
  clusterSizeBuffer.writeUInt32BE(cluster.length)

  return Buffer.concat([self._headerBuffer, clusterSizeBuffer, cluster])
}

module.exports = EncodedStream

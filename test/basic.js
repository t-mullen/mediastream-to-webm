var test = require('tape')

var gum = require('getusermedia')
var mod = require('./../')

function newViewer (enc) {
  var dec = mod.DecodedStream()

  enc.pipe(dec)

  dec.videoElement.style.width = '100px'
  dec.videoElement.style.background = 'black'
  dec.videoElement.autoplay = true
  dec.videoElement.oncanplay = function () {
    dec.videoElement.play()
  }

  dec.videoElement.addEventListener('error', function () {
    console.error(dec.videoElement.error)
    console.error(dec._wrapper.detailedError)
  })

  document.body.appendChild(dec.videoElement)
}

test('basic', function (t) {
  gum({
    video: true,
    audio: true
  }, (err, ms) => {
    if (err) throw err

    var enc = mod.EncodedStream(ms)
    console.log('t0')
    newViewer(enc) // t0

    var chunkCount = 0
    enc.on('data', function (chunk) {
      chunkCount++
      console.log('sent chunk ', chunkCount)
      console.log(document.querySelector('video').currentTime)

      if (chunkCount === 3) {
        console.log('t1')
        newViewer(enc) // skip 3 chunks
      }
      if (chunkCount === 10) {
        console.log('t2')
        newViewer(enc) // skip 10 chunks
      }
    })
  })
})

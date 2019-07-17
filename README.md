# mediastream-to-webm

## Temporarily broken - the MediaRecorder API has dramatically changed it's WebM format

Converts MediaStreams to live WebM streams. Currently only for Chrome.

Allows you to send video/audio as a single outgoing data stream to many peers.

## Features
- Packages webm clusters and headers into standalone chunks that don't require the entire stream.
- Fixes MSE problems with timestamp gaps.
- Abstracts away recording and source buffers.

## Install
```javascript
var MediaStreamToWebm = require('mediastream-to-webm')
```

```html
<script src="dist/mediastream-to-webm.js" />
```

## Usage

```javascript
// Wrap your MediaStream into an encoder
var encodedStream = MediaStreamToWebm.EncodedStream(mediaStream)

// The encoded stream is a ReadableStream
encodedStream.pipe(socket1) 
encodedStream.pipe(socket2) // pipe as many times as you want, at any time, without worrying about the structure of the stream
encodedStream.pipe(socket2)
// ...
```

```javascript
var decodedStream = MediaStreamToWebm.DecodedStream()
socket.pipe(decodedStream) // pipe the encoded stream into the decoded

// The buffered video element is available for us to watch!
var video = decodedStream.videoElement
video.autoplay = true
video.oncanplay = function () {
    video.play()
}
document.body.appendChild(video) 
```

## API
### `MediaStreamToWebm.EncodedStream(mediaStream, opts)`
Encode a MediaStream into a webm data stream.

`mediaStream` - The input MediaStream you want to broadcast.

`opts` - Options object. Default is:

```javascript
{
    interval: 10,
    mimeType: 'video/webm; codecs="opus,vp8"'
}
```

### `MediaStreamToWebm.DecodedStream(opts)`
Decode an encoded webm data stream. Decoded data will be buffered into a video element.

`opts` - Options object. Default is:

```javascript
{
    videoElement: null, // specify an existing video element
    mimeType: 'video/webm; codecs="opus,vp8"'
}
```

## `DecodedStream.videoElement`
The video element that will be buffered with the decoded webm stream.

## Notes
- Currently only works on Chrome (Firefox refuses to accept a webm stream from their own MediaRecorder...)
- This module has additional overhead for live streaming. If you want just want a prerecorded stream, use `media-recorder-stream`.
- Headers are sent with every chunk and this packaged needs to be decoded. You won't be able to pass the data stream directly into a webm player.
- Less efficient and versatile than sending MediaStreams over WebRTC. This "dumb" video stream is not meant to be a replacement for the adaptive bitrate, network-aware SRTP protocol used by WebRTC.

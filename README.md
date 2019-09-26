# AudioParam.getValueAtTime()

This code monkey patches AudioParams with a method to get values at any time

## Getting started

### Install

`npm i audioparam-getvalueattime`

### Example


```javascript
import 'audioparam-getvalueattime'

// if you interrupt a schedulement with cancelAndHoldAtTime,
// then you can continue from there with new events, e.g. ramps
// but if there was nothing scheduled, then it will try to run your ramp from
// the end of a last event
const properCancelAndHold = (node, time) => {
  if (node.hasScheduledChangesAtTime(time)) {
    node.cancelAndHoldAtTime(time)
  } else {
    const valueAtTime = node.getValueAtTime(time)
    node.setValueAtTime(valueAtTime, time)
  }
}

const ctx = new AudioContext()
const volume = ctx.createGain()
const oscillator = ctx.createOscillator()

// ...

const attack = 0.1
const release = 0.3

const scheduleNoteOn = (pitch, velocity, t) => {
  const gain = volume.gain
  const frequency = oscillator.frequency
  properCancelAndHold(gain, t)
  gain.linearRampToValueAtTime(velocity, t + attack)
  frequency.setValueAtTime(pitch, t)
}

const scheduleNoteOff = (t) => {
  const gain = volume.gain
  properCancelAndHold(gain, t)
  gain.linearRampToValueAtTime(0, t + release)
}

// ...

const startTime = ctx.currentTime

scheduleNoteOn(440, 0.5, startTime)
scheduleNoteOff(startTime + 1)

scheduleNoteOn(550, 0.5, startTime + 2)
scheduleNoteOff(startTime + 3)

scheduleNoteOn(660, 0.5, startTime + 2.5)
scheduleNoteOff(startTime + 3.5)

```

## API

The lib has no exports, since it's an IIFE, that will automatically run and patch up the native AudioContext

The following methods will become available on AudioParam instances:

`AudioParam.prototype.getValueAtTime(t)` - calculates the value at `t` time based on scheduled changes

`AudioParam.prototype.hasScheduledChangesAtTime(t)` - checks whether there are any changes scheduled at or after `t` time

## TODOs / Limitations

* `setValueCurveAtTime` interrupted with `cancelAndHoldAtTime` is not yet calculated, when evaluating schedulement
( internally we replace events sliced by a cancelling event with a smaller, interpolated event, because we don't store the cancelling event )

/* global BaseAudioContext, AudioContext, webkitAudioContext, AudioParam */

import { isEmpty, prop, compose, not, clamp, isNil, reject, append, equals, lt, __, gte, either, filter, both, reduce, max, pluck, unless, find, propEq, min, gt, last, has, all, props, add } from 'ramda'
import { getLinearRampToValueAtTime, getExponentialRampToValueAtTime, getTargetValueAtTime, getValueCurveAtTime } from 'pseudo-audio-param/lib/expr.js'

const AudioContextClass = isNil(window.BaseAudioContext) ? (isNil(window.AudioContext) ? webkitAudioContext : AudioContext) : BaseAudioContext

const maxAll = reduce(max, -Infinity)
const minAll = reduce(min, Infinity)

const findLastChangeBeforeTime = (scheduledChanges, time) => {
  const targetTimeOfLastChange = compose(
    maxAll,
    filter(lt(__, time)),
    pluck('targetTime')
  )(scheduledChanges)

  return find(propEq('targetTime', targetTimeOfLastChange), scheduledChanges)
}

const findFirstChangeAfterTime = (scheduledChanges, time) => {
  const targetTimeOfLastChange = compose(
    minAll,
    filter(gt(__, time)),
    pluck('targetTime')
  )(scheduledChanges)

  return find(propEq('targetTime', targetTimeOfLastChange), scheduledChanges)
}

const getTargetValueOfChange = scheduledChange => {
  if (scheduledChange.method === 'setValueCurveAtTime') {
    return last(scheduledChange.params[0])
  } else {
    return scheduledChange.params[0]
  }
}

const evaluateSchedulement = (scheduledChanges, initialValue, initialTime, endTime = Infinity) => {
  const lastChangeBeforeTime = findLastChangeBeforeTime(scheduledChanges, endTime)
  const firstChangeAfterTime = findFirstChangeAfterTime(scheduledChanges, endTime)

  let value = isNil(lastChangeBeforeTime) ? initialValue : getTargetValueOfChange(lastChangeBeforeTime)
  if (!isNil(firstChangeAfterTime)) {
    const endTimeOfLastChange = isNil(lastChangeBeforeTime) ? initialTime : lastChangeBeforeTime.targetTime
    switch (firstChangeAfterTime.method) {
      case 'linearRampToValueAtTime':
        value = getLinearRampToValueAtTime(endTime, value, getTargetValueOfChange(firstChangeAfterTime), endTimeOfLastChange, firstChangeAfterTime.targetTime)
        break
      case 'exponentialRampToValueAtTime':
        value = getExponentialRampToValueAtTime(endTime, value, getTargetValueOfChange(firstChangeAfterTime), endTimeOfLastChange, firstChangeAfterTime.targetTime)
        break
      case 'setTargetAtTime':
        value = getTargetValueAtTime(endTime, value, firstChangeAfterTime.params[0], firstChangeAfterTime.params[1], firstChangeAfterTime.params[2])
        break
      case 'setValueCurveAtTime':
        value = getValueCurveAtTime(endTime, firstChangeAfterTime.params[0], firstChangeAfterTime.params[1], firstChangeAfterTime.params[2])
        break
    }
  }

  return value
}

const scheduleChange = (audioParam, method, params, targetTime) => {
  const now = audioParam._ctx.currentTime

  const outdatedSchedulements = filter(compose(
    both(
      gte(__, audioParam._valueWasLastSetAt),
      lt(__, now)
    ),
    prop('targetTime')
  ))(audioParam._scheduledChanges)

  if (!isEmpty(outdatedSchedulements)) {
    audioParam._valueWasLastSetAt = compose(
      maxAll,
      pluck('targetTime')
    )(outdatedSchedulements)
    audioParam._value = evaluateSchedulement(outdatedSchedulements, audioParam._value, audioParam._valueWasLastSetAt)
  }

  audioParam._scheduledChanges = compose(
    unless(
      () => method === 'cancelScheduledValues',
      append({
        method,
        params,
        targetTime: clamp(now, Infinity, targetTime)
      })
    ),
    reject(compose(
      either(
        (method === 'cancelScheduledValues' ? gte(__, targetTime) : equals(__, targetTime)),
        lt(__, now)
      ),
      prop('targetTime')
    ))
  )(audioParam._scheduledChanges)
}

// gotChangesScheduled :: audioParam -> bool
const gotChangesScheduled = compose(
  not,
  isEmpty,
  prop('_scheduledChanges')
)

const getValueAtTime = (audioParam, time) => {
  if (gotChangesScheduled(audioParam)) {
    return evaluateSchedulement(audioParam._scheduledChanges, audioParam._value, audioParam._valueWasLastSetAt, time)
  } else {
    return audioParam._value
  }
}

// The AudioContext, on which the createX function was called is not accessible from the created AudioNode's params.
// This will bind the AudioContext to the AudioParam's _ctx property.
//
// Example:
//   const osc = ctx.createOscillator()
//   console.log(osc.frequency._ctx === ctx) // true
const bindContextToParams = (creatorName, params) => {
  const originalFn = AudioContextClass.prototype[creatorName]
  if (!isNil(originalFn)) {
    AudioContextClass.prototype[creatorName] = function (...args) {
      const ctx = this
      const node = originalFn.apply(ctx, args)
      params.forEach(param => {
        const audioParam = node[param]
        audioParam._ctx = ctx
        audioParam._value = audioParam.value
        audioParam._valueWasLastSetAt = 0
        audioParam._scheduledChanges = []

        // ramps don't take effect, until there was at least one scheduled change
        // audioParam._hadFinishedSchedulement = false // TODO: when to set this to true?
      })
      return node
    }
  }
}

const bindSchedulerToParamMethod = (methodName, timeArgIndexes = []) => {
  const originalFn = AudioParam.prototype[methodName]
  if (!isNil(originalFn)) {
    AudioParam.prototype[methodName] = function (...args) {
      const audioParam = this
      let targetTime = Infinity
      if (!isEmpty(timeArgIndexes) && all(has(__, args), timeArgIndexes)) {
        targetTime = reduce(add, 0, props(timeArgIndexes, args))
      }
      scheduleChange(audioParam, methodName, args, targetTime)
      originalFn.apply(audioParam, args)
      return audioParam
    }
  }
}

// older Firefox versions always return the defaultValue when reading the value from an AudioParam
// the correct current value can be read from audioParam._value
const hijackParamValueSetter = () => {
  const descriptor = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value')
  const originalSetter = descriptor.set
  descriptor.set = function (newValue) {
    const audioParam = this
    // value change gets ignored in Firefox and Safari, if there are changes scheduled
    if (!gotChangesScheduled(audioParam)) {
      audioParam._value = clamp(audioParam.minValue, audioParam.maxValue, newValue)
      audioParam._valueWasLastSetAt = audioParam._ctx.currentTime
      originalSetter.call(audioParam, newValue)
    }
  }
  Object.defineProperty(AudioParam.prototype, 'value', descriptor)
}

export {
  scheduleChange,
  gotChangesScheduled,
  getValueAtTime,
  bindContextToParams,
  bindSchedulerToParamMethod,
  hijackParamValueSetter
}

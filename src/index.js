/* global AudioParam */

import { isNil } from 'ramda'
import {
  getValueAtTime,
  bindContextToParams,
  bindSchedulerToParamMethod,
  hijackParamValueSetter,
  hasScheduledChanges
} from './helpers'

if (!isNil(window.AudioParam) && isNil(AudioParam.prototype.getValueAtTime)) {
  // bind all the create* functions, which create objects with at least 1 AudioParam among their properties:
  bindContextToParams('createBiquadFilter', ['frequency', 'detune', 'Q', 'gain'])
  bindContextToParams('createBufferSource', ['detune', 'playbackRate'])
  bindContextToParams('createConstantSource', ['offset'])
  bindContextToParams('createDelay', ['delayTime'])
  bindContextToParams('createDynamicsCompressor', ['threshold', 'knee', 'ratio', 'attack', 'release'])
  bindContextToParams('createGain', ['gain'])
  bindContextToParams('createOscillator', ['frequency', 'detune'])
  bindContextToParams('createPanner', ['orientationX', 'orientationY', 'orientationZ', 'positionX', 'positionY', 'positionZ'])
  bindContextToParams('createStereoPanner', ['pan'])

  // hijack param methods and mark which argument has the time
  bindSchedulerToParamMethod('cancelScheduledValues', [0])
  bindSchedulerToParamMethod('setValueAtTime', [1])
  bindSchedulerToParamMethod('linearRampToValueAtTime', [1])
  bindSchedulerToParamMethod('exponentialRampToValueAtTime', [1])
  bindSchedulerToParamMethod('setTargetAtTime', [])
  bindSchedulerToParamMethod('setValueCurveAtTime', [1, 2])

  if (!isNil(AudioParam.prototype.cancelAndHoldAtTime)) {
    bindSchedulerToParamMethod('cancelAndHoldAtTime', [0])
  }

  hijackParamValueSetter()

  AudioParam.prototype.getValueAtTime = function (time) {
    const audioParam = this
    return getValueAtTime(audioParam, time)
  }

  AudioParam.prototype.hasScheduledChanges = function () {
    const audioParam = this
    return hasScheduledChanges(audioParam)
  }
}

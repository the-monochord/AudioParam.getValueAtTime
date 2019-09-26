# AudioParam.getValueAtTime()

This code monkey patches AudioParams with a method to get values at any time

## install

`npm i audioparam-getvalueattime`

## API

`AudioParam.prototype.getValueAtTime(t)` - calculates the value at `t` time based on scheduled changes

`AudioParam.prototype.hasScheduledChangesAtTime(t)` - checks whether there are any changes scheduled at or after `t` time

## TODOs / Limitations

* `setValueCurveAtTime` interrupted with `cancelAndHoldAtTime` is not yet calculated, when evaluating schedulement
( internally we replace events sliced by a cancelling event with a smaller, interpolated event, because we don't store the cancelling event )

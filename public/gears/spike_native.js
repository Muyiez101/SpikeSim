/* Native calls are a fixed operation table, never JavaScript source. GPL-3.0. */
var $builtinmodule = function () {
  return {
    instant:new Sk.builtin.func(function(operation,args){try{return Sk.ffi.remapToPy(window.spikeStudent.instant(operation.v,Sk.ffi.remapToJs(args)));}catch(error){throw new Sk.builtin.RuntimeError(error.message);}}),
    begin:new Sk.builtin.func(function(operation,args){return Sk.ffi.remapToPy(window.spikeStudent.begin(operation.v,Sk.ffi.remapToJs(args)));}),
    poll:new Sk.builtin.func(function(id){try{return Sk.ffi.remapToPy(window.spikeStudent.poll(Sk.ffi.remapToJs(id)));}catch(error){throw new Sk.builtin.RuntimeError(error.message);}}),
    perform: new Sk.builtin.func(function (operation, args) {
    return Sk.misceval.promiseToSuspension(window.spikeStudent.action(operation.v, Sk.ffi.remapToJs(args)).then(function(value) {
      return Sk.ffi.remapToPy(value === undefined ? null : value);
    }, function(error) { throw new Sk.builtin.RuntimeError(error.message); }));
  })};
};

var global = Function('return this')();

var _sorter_projection = function (Minimongo, LocalCollection) {

Minimongo.Sorter.prototype.combineIntoProjection = function (projection) {
  var self = this;
  var specPaths = Minimongo._pathsElidingNumericKeys(self._getPaths());
  return combineImportantPathsIntoProjection(specPaths, projection);
};

}

if(global.Minimongo && global.LocalCollection){
  _sorter_projection(Minimongo, LocalCollection);
}

module.exports = _sorter_projection;

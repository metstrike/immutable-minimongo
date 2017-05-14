var global = Function('return this')();
var DiffSequence = require('metstrike-diff-sequence');

// ordered: bool.
// old_results and new_results: collections of documents.
//    if ordered, they are arrays.
//    if unordered, they are IdMaps
function addToLocalCollection (LocalCollection) {

LocalCollection._diffQueryChanges = function (ordered, oldResults, newResults, observer, options) {
  return DiffSequence.diffQueryChanges(ordered, oldResults, newResults, observer, options);
};

LocalCollection._diffQueryUnorderedChanges = function (oldResults, newResults, observer, options) {
  return DiffSequence.diffQueryUnorderedChanges(oldResults, newResults, observer, options);
};


LocalCollection._diffQueryOrderedChanges =
  function (oldResults, newResults, observer, options) {
  return DiffSequence.diffQueryOrderedChanges(oldResults, newResults, observer, options);
};

LocalCollection._diffObjects = function (left, right, callbacks) {
  return DiffSequence.diffObjects(left, right, callbacks);
};

}

if(global.LocalCollection){addToLocalCollection(global.LocalCollection);}

module.exports = addToLocalCollection;


var global = Function('return this')();
var MongoID = require('metstrike-mongo-id');
var _ = require('./immutable_underscore.js');

function setObjectId(LocalCollection){

// Is this selector just shorthand for lookup by _id?
LocalCollection._selectorIsId = function (selector) {
  return (typeof selector === "string") ||
    (typeof selector === "number") ||
    selector instanceof MongoID.ObjectID;
};

// Is the selector just lookup by _id (shorthand or not)?
LocalCollection._selectorIsIdPerhapsAsObject = function (selector) {
  return LocalCollection._selectorIsId(selector) ||
    (selector && typeof selector === "object" &&
     selector._id && LocalCollection._selectorIsId(selector._id) &&
     _.size(selector) === 1);
};

// If this is a selector which explicitly constrains the match by ID to a finite
// number of documents, returns a list of their IDs.  Otherwise returns
// null. Note that the selector may have other restrictions so it may not even
// match those document!  We care about $in and $and since those are generated
// access-controlled update and remove.
LocalCollection._idsMatchedBySelector = function (selector) {
  // Is the selector just an ID?
  if (LocalCollection._selectorIsId(selector))
    return [selector];
  if (!selector)
    return null;

  // Do we have an _id clause?
  if (_.has(selector, '_id')) {
    // Is the _id clause just an ID?
    if (LocalCollection._selectorIsId(_.get(selector, '_id')))
      return [_.get(selector, '_id')];
    // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?
    var din = _.get(selector, '_id') && _.get(_.get(selector, '_id'), '$in');
    if (din
        && _.isArray(din)
        && !_.isEmpty(din)
        && _.all(din, LocalCollection._selectorIsId)) {
      return din;
    }
    return null;
  }

  // If this is a top-level $and, and any of the clauses constrain their
  // documents, then the whole selector is constrained by any one clause's
  // constraint. (Well, by their intersection, but that seems unlikely.)
  if (selector.$and && _.isArray(selector.$and)) {
    for (var i = 0; i < selector.$and.length; ++i) {
      var subIds = LocalCollection._idsMatchedBySelector(selector.$and[i]);
      if (subIds)
        return subIds;
    }
  }

  return null;
};

}

if(global.LocalCollection){setObjectId(global.LocalCollection);}

module.exports = setObjectId;

var _ = require('mudash');
var __ = require('underscore');
var Immutable = require('immutable');
var MongoID = require('metstrike-mongo-id');
var EJSON = require('metstrike-ejson');

var I_ = function (){

};

_.assign(I_, _);
I_.extend = _.assign;
I_.any = _.some;
I_.all = _.every;
I_.find = __.find;
I_.pluck = _.map;

I_.isSpecialObject = function(js) {
  if(
    typeof js !== 'object' ||
    js === null ||
    js instanceof Date ||
    js instanceof RegExp ||
    js instanceof MongoID.ObjectID ||
    EJSON.isBinary(js)) {
      return true;
    }

    return false;
};

I_.fromJS = function fromJSOrdered(js) {
  var ret;

  if(I_.isSpecialObject(js)) {
    ret = EJSON.clone(js);
  } else if(Immutable.isImmutable(js)) {
    ret = js;
  } else if(Array.isArray(js) || Immutable.isIndexed(js)) {
    ret = Immutable.Seq(js).map(fromJSOrdered).toList();
  } else {
    ret = Immutable.Seq(js).map(fromJSOrdered).toOrderedMap();
  }

  return ret;
};

I_.toJS = function(js) {
  if(!js) return js;

  var ret = js.toJS();

  return ret;
};

I_.is = function(a, b) {
  return Immutable.isImmutable(a) && Immutable.isImmutable(b)
    ? Immutable.is(a, b)
    : _.isEqual(a, b);
};

// _.isImMap()
// _.isImOrderedMap()
// _.isImList()

I_.isCollection = function(obj) {
  return Immutable.isImmutable(obj);
};

I_.isImmutable = function(obj) {
  return Immutable.isImmutable(obj);
};

I_.isIndexed = function(obj) {
  return Immutable.isIndexed(obj);
};

I_.isKeyed = function(obj) {
  return Immutable.isKeyed(obj);
};

I_.toSeq = function(js) {
    return Immutable.Seq(js);
}

module.exports = I_;

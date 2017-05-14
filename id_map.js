var global = Function('return this')();
var _ = require('underscore');
var MongoID = require('metstrike-mongo-id');
var Immutable = require('immutable');

function setIdMap(LocalCollection, Meteor){

LocalCollection._IdMap = function () {
  var self = this;

  self._map = new Immutable.OrderedMap();
  self._idStringify = MongoID.idStringify || JSON.stringify;
  self._idParse = MongoID.idParse || JSON.parse;
};

_.extend(LocalCollection._IdMap.prototype, {
  get: function (id) {
    var self = this;
    var key = self._idStringify(id);
    return self._map.get(key);
  },
  set: function (id, value) {
    var self = this;
    var key = self._idStringify(id);
    self._map = self._map.set(key, value);
    return self;
  },
  remove: function (id) {
    var self = this;
    var key = self._idStringify(id);
    self._map = self._map.remove(key);
    return self;
  },
  has: function (id) {
    var self = this;
    var key = self._idStringify(id);
    return self._map.has(key);
  },
  empty: function () {
    var self = this;
    return self._map.isEmpty();
  },
  clear: function () {
    var self = this;
    self._map = self._map.clear();
    return self;
  },
  // Iterates over the items in the map. Return `false` to break the loop.
  forEach: function (iterator) {
    var self = this;

    return self._map.forEach(function(value, key) {
      return iterator.call(null, value, self._idParse(key));
    });
  },
  size: function () {
    var self = this;
    return self._map.count();
  },
  count: function () {
    var self = this;
    return self._map.count();
  },
  setDefault: function (id, def) {
    var self = this;
    var key = self._idStringify(id);
    if (this.has(key))
      return get(key);
    self._map = self._map.set(key, def);
    return def;
  },
  clone: function () {
    var self = this;
    var cl = new LocalCollection._IdMap();
    cl._map = self._map;
    return cl;
  },
  asMutable: function() {
    var self = this;
    self._map = self._map.asMutable();
    return self;
  },
  asImmutable: function() {
    var self = this;
    self._map = self._map.asImmutable();
    return self;
  },
  sort: function(comparator) {
    var self = this;
    self._map = self._map.sort(comparator);
    return self;
  },
  slice: function(start, end) {
    var self = this;
    self._map = self._map.slice(start, end);
    return self;
  },
  toMap: function() {
    var self = this;
    return self._map;
  }
});
}

if(global.Meteor && global.LocalCollection){setIdMap(LocalCollection, Meteor);}

module.exports = setIdMap;

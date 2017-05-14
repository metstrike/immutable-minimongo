var mm = require('./minimongo.js');
var _ = require('./immutable_underscore.js');

var LegacyLocalCollection = function() {
  var self = this;

  self.localCollection = new mm.LocalCollection();
};

LegacyLocalCollection.Cursor = function (cursor) {
  var self = this;

  self.cursor = cursor;
}

LegacyLocalCollection.Cursor.prototype.rewind = function () {
};

LegacyLocalCollection.Cursor.prototype.forEach = function (callback, thisArg) {
  var self = this;

  return self.cursor.forEach(function(elt, i) {
    callback.call(thisArg, _.toJS(elt), i, self);
  });
}

LegacyLocalCollection.Cursor.prototype.map = function (callback, thisArg) {
  var self = this;
  var res = [];

  self.forEach(function (doc, index) {
    res.push(callback.call(thisArg, doc, index, self));
  });

  return res;
};

LegacyLocalCollection.Cursor.prototype.fetch = function () {
  var self = this;
  var res = [];
  self.forEach(function (doc) {
    res.push(doc);
  });
  return res;
};

LegacyLocalCollection.Cursor.prototype.count = function () {
  var self = this;

  return self.cursor.count();
};

LegacyLocalCollection.Cursor._makeCallbacks = function(options) {
  var callbacks = {};

  if(options) {
    if(options._suppress_initial !== undefined) {
      callbacks._suppress_initial = options._suppress_initial;
    }

    if(options._no_indices !== undefined) {
      callbacks._no_indices = options._no_indices;
    }

    if(options.added) {
      callbacks.added = function(doc) {
        return options.added(_.toJS(doc));
      };
    }
    if(options.addedAt) {
      callbacks.addedAt = function(doc, index, before) {
        return options.addedAt(_.toJS(doc), index, before);
      };
    }
    if(options.changed) {
      callbacks.changed = function(doc, oldDoc) {
        return options.changed(_.toJS(doc), _.toJS(oldDoc));
      };
    }
    if(options.changedAt) {
      callbacks.changedAt = function(doc, oldDoc, index) {
        return options.changedAt(_.toJS(doc), _.toJS(oldDoc), index);
      };
    }
    if(options.movedTo) {
      callbacks.movedTo = function(doc, from, to, before) {
        return options.movedTo(_.toJS(doc), from, to, before);
      };
    }
    if(options.removed) {
      callbacks.removed = function(doc) {
        return options.removed(_.toJS(doc));
      };
    }
    if(options.removedAt) {
      callbacks.removedAt = function(doc, index) {
        return options.removedAt(_.toJS(doc), index);
      };
    }
  } else {
    callbacks = options;
  }

  return callbacks;
};

LegacyLocalCollection.Cursor.prototype.observe = function (options) {
  var self = this;

  var handle = self.cursor.observe(LegacyLocalCollection.Cursor._makeCallbacks(options));

  return handle;
};

LegacyLocalCollection.Cursor._makeChangesCallbacks = function(options) {
  var callbacks = {};

  if(options) {
    if(options._suppress_initial !== undefined) {
      callbacks._suppress_initial = options._suppress_initial;
    }

    if(options._no_indices !== undefined) {
      callbacks._no_indices = options._no_indices;
    }

    if(options.added) {
      callbacks.added = function(id, fields) {
        return options.added(id, _.toJS(fields));
      };
    }
    if(options.addedBefore) {
      callbacks.addedBefore = function(id, fields, before) {
        return options.addedBefore(id, _.toJS(fields), before);
      };
    }
    if(options.changed) {
      callbacks.changed = function(id, fields) {
        return options.changed(id, _.toJS(fields));
      };
    }
    if(options.movedBefore) {
      callbacks.movedBefore = function(id, before) {
        return options.movedBefore(id, before);
      };
    }
    if(options.removed) {
      callbacks.removed = function(id) {
        return options.removed(id);
      };
    }
  } else {
    callbacks = options;
  }

  return callbacks;
};

LegacyLocalCollection.Cursor.prototype.observeChanges = function (options) {
  var self = this;

  return self.cursor.observeChanges(LegacyLocalCollection.Cursor._makeChangesCallbacks(options));
};

LegacyLocalCollection.prototype.find = function (selector, options) {
  var self = this;

  return new LegacyLocalCollection.Cursor(self.localCollection.find.apply(self.localCollection, arguments));
};

LegacyLocalCollection.prototype.findOne = function (selector, options) {
  var self = this;

  return _.toJS(self.localCollection.findOne.apply(self.localCollection, arguments));
};

LegacyLocalCollection.prototype.insert = function (doc, callback) {
  var self = this;

  return self.localCollection.insert.apply(self.localCollection, arguments);
};

LegacyLocalCollection.prototype.remove = function (selector, callback) {
  var self = this;

  return self.localCollection.remove.apply(self.localCollection, arguments);
};

LegacyLocalCollection.prototype.update = function (selector, mod, options, callback) {
  var self = this;

  return self.localCollection.update.apply(self.localCollection, arguments);
};

LegacyLocalCollection.prototype.upsert = function (selector, mod, options, callback) {
  var self = this;

  return self.localCollection.upsert.apply(self.localCollection, arguments);
};

LegacyLocalCollection.prototype.pauseObservers = function () {
  var self = this;

  return self.localCollection.pauseObservers();
}

LegacyLocalCollection.prototype.resumeObservers = function () {
  var self = this;

  return self.localCollection.resumeObservers();
}

LegacyLocalCollection.prototype.saveOriginals = function () {
  var self = this;

  return self.localCollection.saveOriginals();
}

LegacyLocalCollection._IdMap = function (idMap) {
  var self = this;

  self.idMap = idMap;
}

LegacyLocalCollection._IdMap.prototype.get = function (id) {
    var self = this;

    return _.toJS(self.idMap.get(id));
}

LegacyLocalCollection._IdMap.prototype.size = function () {
    var self = this;

    return self.idMap.size();
}

LegacyLocalCollection._IdMap.prototype.empty = function () {
    var self = this;

    return self.idMap.empty();
}

LegacyLocalCollection._IdMap.prototype.has = function (id) {
    var self = this;

    return self.idMap.has(id);
}

LegacyLocalCollection.prototype.retrieveOriginals = function () {
  var self = this;

  return new LegacyLocalCollection._IdMap(self.localCollection.retrieveOriginals());
}

LegacyLocalCollection._binarySearch = function (cmp, array, value) {
  var self = this;

  return mm.LocalCollection._binarySearch(cmp, array, value);
}

LegacyLocalCollection._compileProjection = function (fields) {
  var projection_f =  mm.LocalCollection._compileProjection(fields);

  return function(doc) {
    return _.toJS(projection_f(_.fromJS(doc)));
  };
};

LegacyLocalCollection._idsMatchedBySelector = function (selector) {
  var self = this;

  return mm.LocalCollection._idsMatchedBySelector(selector);
};

LegacyLocalCollection._f = {
  // XXX for _all and _in, consider building 'inquery' at compile time..

  _type: function (v) {
    return mm.LocalCollection._f._type(_.fromJS(v));
  },

  // deep equality test: use for literal document and array matches
  _equal: function (a, b) {
    return mm.LocalCollection._f._equal(_.fromJS(a), _.fromJS(b));
  },

  // maps a type code to a value that can be used to sort values of
  // different types
  _typeorder: function (t) {
    return mm.LocalCollection._f._typeorder(_.fromJS(t));
  },

  // compare two values of unknown type according to BSON ordering
  // semantics. (as an extension, consider 'undefined' to be less than
  // any other value.) return negative if a is less, positive if b is
  // less, or 0 if equal
  _cmp: function (a, b) {
    return mm.LocalCollection._f._cmp(_.fromJS(a), _.fromJS(b));
  }
};

var LegacyMinimongo = {};

// Object exported only for unit testing.
// Use it to export private functions to test in Tinytest.
var LegacyMinimongoTest = {};

LegacyMinimongo.Matcher = function (selector) {
  var self = this;

  self.matcher = new mm.Minimongo.Matcher(selector);
};

LegacyMinimongo.Matcher.prototype.documentMatches = function (doc) {
  var self = this;

  return self.matcher.documentMatches(_.fromJS(doc));
};

LegacyMinimongo.Sorter = function (spec, options) {
  var self = this;

  self.sorter = new mm.Minimongo.Sorter(spec, options);
};

LegacyMinimongo.Sorter.prototype.getComparator = function (options) {
  var self = this;

  var cmp = self.sorter.getComparator(options);

  return function(a, b) {
    return cmp(_.fromJS(a), _.fromJS(b));
  };
};

LegacyMinimongo.Sorter.prototype._keyCompatibleWithSelector = function (key) {
  var self = this;

  return self.sorter._keyCompatibleWithSelector(_.fromJS(key));
};

// Iterates over each possible "key" from doc (ie, over each branch), calling
// 'cb' with the key.
LegacyMinimongo.Sorter.prototype._generateKeysFromDoc = function (doc, cb) {
  var self = this;

  return self.sorter._generateKeysFromDoc(_.fromJS(doc), cb);
};

module.exports = {
  Minimongo: LegacyMinimongo,
  LocalCollection: LegacyLocalCollection,
  MinimongoTest: mm.MinimongoTest,
  ReactiveDict: mm.ReactiveDict,
  ReactiveVar: mm.ReactiveVar,
  Tracker: mm.Tracker,
  MongoID: mm.MongoID,
  MinimongoError: mm.MinimongoError,
  EJSON: mm.EJSON
};

var global = Function('return this')();
var _ = require('./immutable_underscore.js');
var Immutable = require('immutable');
var EJSON = require('metstrike-ejson');

// XXX need a strategy for passing the binding of $ into this
// function, from the compiled selector
//
// maybe just {key.up.to.just.before.dollarsign: array_index}
//
// XXX atomicity: if one modification fails, do we roll back the whole
// change?
//
// options:
//   - isInsert is set when _modify is being called to compute the document to
//     insert as part of an upsert operation. We use this primarily to figure
//     out when to set the fields in $setOnInsert, if present.
function setModify(Minimongo, LocalCollection, MinimongoError){

LocalCollection._modify = function (doc, mod, options) {
  options = options || {};

  if (!isPlainObject(mod))
    throw MinimongoError("Modifier must be an object");

  var isModifier = isOperatorObject(mod);

  var newDoc;

  if (!isModifier) {
    if (mod.get('_id') && !_.is(doc.get('_id'), mod.get('_id')))
      throw MinimongoError("Cannot change the _id of a document");

    // replace the whole document
    for (var k in mod.keys()) {
      if (/\./.test(k))
        throw MinimongoError(
          "When replacing document, field name may not contain '.'");
    }
    if(mod.get('_id')) {
      newDoc = mod;
    } else {
      newDoc = new Immutable.OrderedMap().asMutable();
      newDoc.set('_id', doc.get('_id'));
      _.assign(newDoc, mod);
    }
  } else {
    // apply modifiers to the doc.
    newDoc = doc.asMutable();

    mod.forEach(function (operand, op) {
      var modFunc = MODIFIERS[op];
      // Treat $setOnInsert as $set if this is an insert.
      if (options.isInsert && op === '$setOnInsert')
        modFunc = MODIFIERS['$set'];
      if (!modFunc)
        throw MinimongoError("Invalid modifier specified " + op);
      operand.forEach(function (arg, keypath) {
        if (keypath === '') {
          throw MinimongoError("An empty update path is not valid.");
        }

        if (keypath === '_id' && op !== '$setOnInsert') {
          throw MinimongoError("Mod on _id not allowed");
        }

        var keyparts = keypath.split('.');

        if (! _.all(keyparts, _.identity)) {
          throw MinimongoError(
            "The update path '" + keypath +
              "' contains an empty field name, which is not allowed.");
        }

        var noCreate = _.has(NO_CREATE_MODIFIERS, op);
        var forbidArray = (op === "$rename");
        var target = findModTarget(newDoc, keyparts, {
          noCreate: NO_CREATE_MODIFIERS[op],
          forbidArray: (op === "$rename"),
          arrayIndices: options.arrayIndices
        });
        var field = keyparts.pop();
        modFunc(target, field, arg, keypath, newDoc);
      });
    });
  }

  // make modified document immutable again
  return _.fromJS(newDoc);
};

// for a.b.c.2.d.e, keyparts should be ['a', 'b', 'c', '2', 'd', 'e'],
// and then you would operate on the 'e' property of the returned
// object.
//
// if options.noCreate is falsey, creates intermediate levels of
// structure as necessary, like mkdir -p (and raises an exception if
// that would mean giving a non-numeric property to an array.) if
// options.noCreate is true, return undefined instead.
//
// may modify the last element of keyparts to signal to the caller that it needs
// to use a different value to index into the returned object (for example,
// ['a', '01'] -> ['a', 1]).
//
// if forbidArray is true, return null if the keypath goes through an array.
//
// if options.arrayIndices is set, use its first element for the (first) '$' in
// the path.
var findModTarget = function (doc, keyparts, options) {
  options = options || {};
  var usedArrayIndex = false;
  for (var i = 0; i < keyparts.length; i++) {
    var last = (i === keyparts.length - 1);
    var keypart = keyparts[i];
    var indexable = isIndexable(doc);
    if (!indexable) {
      if (options.noCreate)
        return undefined;
      var e = MinimongoError(
        "cannot use the part '" + keypart + "' to traverse " + doc);
      e.setPropertyError = true;
      throw e;
    }
    if (doc instanceof Array || _.isIndexed(doc)) {
      if (options.forbidArray)
        return null;
      if (keypart === '$') {
        if (usedArrayIndex)
          throw MinimongoError("Too many positional (i.e. '$') elements");
        if (!options.arrayIndices || !options.arrayIndices.length) {
          throw MinimongoError("The positional operator did not find the " +
                               "match needed from the query");
        }
        keypart = options.arrayIndices[0];
        usedArrayIndex = true;
      } else if (isNumericKey(keypart)) {
        keypart = parseInt(keypart);
      } else {
        if (options.noCreate)
          return undefined;
        throw MinimongoError(
          "can't append to array using string field name ["
                    + keypart + "]");
      }
      if (last)
        // handle 'a.01'
        keyparts[i] = keypart;
      if (options.noCreate && keypart >= _.size(doc))
        return undefined;
      while (_.size(doc) < keypart)
        doc.push(null);
      if (!last) {
        if (_.size(doc) === keypart) {
          doc.push(_.fromJS({}).asMutable());
        } else if (typeof _.get(doc, keypart) !== "object") {
          throw MinimongoError("can't modify field '" + keyparts[i + 1] +
                      "' of list value " + JSON.stringify(_.get(doc, keypart)));
        } else {
          var part = _.get(doc, keypart);
          if(_.isImmutable(part)) {
            doc.set(keypart, part.asMutable());
          }
        }
      } else {
        var part = _.get(doc, keypart);
        if(_.isImmutable(part)) {
          doc.set(keypart, part.asMutable());
        }
      }
    } else {
      if (keypart.length && keypart.substr(0, 1) === '$')
        throw MinimongoError("can't set field named " + keypart);
      if (!_.has(doc, keypart)) {
        if (options.noCreate)
          return undefined;
        if (!last)
          doc.set(keypart, _.fromJS({}).asMutable());
      } else {
        var part = _.get(doc, keypart);
        if(_.isImmutable(part)) {
          doc.set(keypart, part.asMutable());
        }
      }
    }

    if (last)
      return doc;
    doc = _.get(doc, keypart);
  }

  // notreached
};

var NO_CREATE_MODIFIERS = {
  $unset: true,
  $pop: true,
  $rename: true,
  $pull: true,
  $pullAll: true
};

var MODIFIERS = {
  $currentDate: function (target, field, arg) {
    if (typeof arg === "object" && _.has(arg, "$type")) {
       if (_.get(arg, "$type") !== "date") {
          throw MinimongoError(
            "Minimongo does currently only support the date type " +
            "in $currentDate modifiers",
            { field });
       }
    } else if (arg !== true) {
      throw MinimongoError("Invalid $currentDate modifier", { field });
    }
    target.set(field, new Date());
  },
  $min: function (target, field, arg) {
    if (typeof arg !== "number") {
      throw MinimongoError("Modifier $min allowed for numbers only", { field });
    }
    if(_.has(target, field)) {
      var value = _.get(target, field);
      if (typeof value !== "number") {
        throw MinimongoError(
          "Cannot apply $min modifier to non-number", { field });
      }
      if (value > arg) {
        target.set(field, arg);
      }
    } else {
      target.set(field, arg);
    }
  },
  $max: function (target, field, arg) {
    if (typeof arg !== "number") {
      throw MinimongoError("Modifier $max allowed for numbers only", { field });
    }
    if(_.has(target, field)) {
      var value = _.get(target, field);
      if (typeof value !== "number") {
        throw MinimongoError(
          "Cannot apply $max modifier to non-number", { field });
      }
      if (value < arg) {
         target.set(field, arg);
      }
    } else {
      target.set(field, arg);
    }
  },
  $inc: function (target, field, arg) {
    if (typeof arg !== "number")
      throw MinimongoError("Modifier $inc allowed for numbers only", { field });
    if(_.has(target, field)) {
      var value = _.get(target, field);
      if (typeof value !== "number")
        throw MinimongoError(
          "Cannot apply $inc modifier to non-number", { field });
      target.set(field, value+arg);
    } else {
      target.set(field, arg);
    }
  },
  $set: function (target, field, arg) {
    if (!_.isObject(target)) { // not an array or an object
      var e = MinimongoError(
        "Cannot set property on non-object field", { field });
      e.setPropertyError = true;
      throw e;
    }
    if (target === null) {
      var e = MinimongoError("Cannot set property on null", { field });
      e.setPropertyError = true;
      throw e;
    }
    if (_.isString(field) && field.indexOf('\0') > -1) {
      // Null bytes are not allowed in Mongo field names
      // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
      throw MinimongoError(`Key ${field} must not contain null bytes`);
    }
    if(_.isImMap(target) || _.isImList) {
      target.set(field, arg);
    }
  },
  $setOnInsert: function (target, field, arg) {
    // converted to `$set` in `_modify`
  },
  $unset: function (target, field, arg) {
    if (target !== undefined) {
      if (_.isIndexed(target)) {
        if(_.has(target, field))
          target.set(field, null);
      } else
          target.remove(field);
    }
  },
  $push: function (target, field, arg) {
    var value = _.get(target, field);
    if (value === undefined) {
      value = _.fromJS([]).asMutable();
      target.set(field, value);
    }
    if (!_.isIndexed(value))
      throw MinimongoError(
        "Cannot apply $push modifier to non-array", { field });

    if (!(arg && _.get(arg, '$each'))) {
      // Simple mode: not $each
      value.push(arg);
      return;
    }

    // Fancy mode: $each (and maybe $slice and $sort and $position)
    var toPush = _.get(arg, '$each');
    if (!_.isIndexed(toPush))
      throw MinimongoError("$each must be an array", { field });

    // Parse $position
    var position = undefined;
    if (_.has(arg, '$position')) {
      position = _.get(arg, '$position');
      if (typeof position !== "number")
        throw MinimongoError("$position must be a numeric value", { field });
      // XXX should check to make sure integer
      if (position < 0)
        throw MinimongoError(
          "$position in $push must be zero or positive", { field });
    }

    // Parse $slice.
    var slice = undefined;
    if (_.has(arg, '$slice')) {
      slice = _.get(arg, '$slice');
      if (typeof slice !== "number")
        throw MinimongoError("$slice must be a numeric value", { field });
      // XXX should check to make sure integer
      if (slice > 0)
        throw MinimongoError(
          "$slice in $push must be zero or negative", { field });
    }

    // Parse $sort.
    var sortFunction = undefined;
    var argsort = _.get(arg, '$sort');
    if (_.has(arg, "$sort") && argsort) {
      if (slice === undefined)
        throw MinimongoError("$sort requires $slice to be present", { field });
      // XXX this allows us to use a $sort whose value is an array, but that's
      // actually an extension of the Node driver, so it won't work
      // server-side. Could be confusing!
      // XXX is it correct that we don't do geo-stuff here?
      sortFunction = new Minimongo.Sorter(argsort).getComparator();
      for (var i = 0; i < _.size(toPush); i++) {
        if (LocalCollection._f._type(_.get(toPush, i)) !== 3) {
          throw MinimongoError("$push like modifiers using $sort " +
                      "require all elements to be objects", { field });
        }
      }
    }

    value = value.asImmutable();

    // Actually push.
    if (position === undefined) {
      value = value.concat(toPush);
    } else {
      var spliceArguments = [position, 0];
      for (var j = 0; j < _.size(toPush); j++)
        spliceArguments.push(_.get(toPush, j));
      value = value.splice.apply(value, spliceArguments);
    }

    // Actually sort.
    if (sortFunction)
      value = value.sort(sortFunction);

    // Actually slice.
    if (slice !== undefined) {
      if (slice === 0)
        value = _.fromJS([]);  // differs from Array.slice!
      else
        value = value.slice(slice);
    }

    target.set(field, value);
  },
  $pushAll: function (target, field, arg) {
    if (!(typeof arg === "object" && _.isIndexed(arg)))
      throw MinimongoError("Modifier $pushAll/pullAll allowed for arrays only");
    var x = _.get(target, field);
    if (x === undefined)
      target.set(field, arg);
    else if (!_.isIndexed(x))
      throw MinimongoError(
        "Cannot apply $pushAll modifier to non-array", { field });
    else {
      for (var i = 0; i < _.size(arg); i++)
        x.push(_.get(arg, i));
    }
  },
  $addToSet: function (target, field, arg) {
    var isEach = false;
    if (typeof arg === "object") {
      //check if first key is '$each'
      _.each(arg, function(obj, k) {
        if (k === "$each")
          isEach = true;
        return false;
      });
    }
    var values = isEach ? _.get(arg, "$each") : _.fromJS([arg]);
    var x = _.get(target, field);
    if (x === undefined)
      target.set(field, values);
    else if (!_.isIndexed(x))
      throw MinimongoError(
        "Cannot apply $addToSet modifier to non-array", { field });
    else {
      _.each(values, function (value) {
        for (var i = 0; i < _.size(x); i++)
          if (LocalCollection._f._equal(value, _.get(x, i)))
            return;
        x.push(value);
      });
    }
  },
  $pop: function (target, field, arg) {
    if (target === undefined)
      return;
    var x = _.get(target, field);
    if (x === undefined)
      return;
    else if (!_.isIndexed(x))
      throw MinimongoError(
        "Cannot apply $pop modifier to non-array", { field });
    else {
      if (typeof arg === 'number' && arg < 0)
        x.remove(0);
      else if(_.size(x) > 0)
        x.remove(_.size(x)-1);
    }
  },
  $pull: function (target, field, arg) {
    if (target === undefined)
      return;
    var x = _.get(target, field);
    if (x === undefined)
      return;
    else if (!_.isIndexed(x))
      throw MinimongoError(
        "Cannot apply $pull/pullAll modifier to non-array", { field });
    else {
      var out = _.fromJS([]).asMutable();
      if (arg != null && typeof arg === "object" && !_.isIndexed(arg)) {
        // XXX would be much nicer to compile this once, rather than
        // for each document we modify.. but usually we're not
        // modifying that many documents, so we'll let it slide for
        // now

        // XXX Minimongo.Matcher isn't up for the job, because we need
        // to permit stuff like {$pull: {a: {$gt: 4}}}.. something
        // like {$gt: 4} is not normally a complete selector.
        // same issue as $elemMatch possibly?
        var matcher = new Minimongo.Matcher(_.toJS(arg));
        for (var i = 0; i < _.size(x); i++)
          if (!matcher.documentMatches(_.get(x, i)).result)
            out.push(_.get(x, i));
      } else {
        for (var i = 0; i < _.size(x); i++)
          if (!LocalCollection._f._equal(_.get(x, i), arg))
            out.push(_.get(x, i));
      }
      target.set(field, out);
    }
  },
  $pullAll: function (target, field, arg) {
    if (!(typeof arg === "object" && _.isIndexed(arg)))
      throw MinimongoError(
        "Modifier $pushAll/pullAll allowed for arrays only", { field });
    if (target === undefined)
      return;
    var x = _.get(target, field);
    if (x === undefined)
      return;
    else if (!_.isIndexed(x))
      throw MinimongoError(
        "Cannot apply $pull/pullAll modifier to non-array", { field });
    else {
      var out = _.fromJS([]).asMutable();
      for (var i = 0; i < _.size(x); i++) {
        var exclude = false;
        for (var j = 0; j < _.size(arg); j++) {
          if (LocalCollection._f._equal(_.get(x, i), _.get(arg, j))) {
            exclude = true;
            break;
          }
        }
        if (!exclude)
          out.push(_.get(x, i));
      }
      target.set(field, out);
    }
  },
  $rename: function (target, field, arg, keypath, doc) {
    if (keypath === arg)
      // no idea why mongo has this restriction..
      throw MinimongoError("$rename source must differ from target", { field });
    if (target === null)
      throw MinimongoError("$rename source field invalid", { field });
    if (typeof arg !== "string")
      throw MinimongoError("$rename target must be a string", { field });
    if (arg.indexOf('\0') > -1) {
      // Null bytes are not allowed in Mongo field names
      // https://docs.mongodb.com/manual/reference/limits/#Restrictions-on-Field-Names
      throw MinimongoError(
        "The 'to' field for $rename cannot contain an embedded null byte",
        { field });
    }
    if (target === undefined)
      return;
    var v = _.get(target, field);
    target.remove(field);

    var keyparts = arg.split('.');
    var target2 = findModTarget(doc, keyparts, {forbidArray: true});
    if (target2 === null)
      throw MinimongoError("$rename target field invalid", { field });
    var field2 = keyparts.pop();
    target2.set(field2, v);
  },
  $bit: function (target, field, arg) {
    // XXX mongo only supports $bit on integers, and we only support
    // native javascript numbers (doubles) so far, so we can't support $bit
    throw MinimongoError("$bit is not supported", { field });
  }
};

}

if(global.LocalCollection && global.Minimongo){setModify(global.Minimongo, global.LocalCollection, global.MinimongoError);}

module.exports = setModify;

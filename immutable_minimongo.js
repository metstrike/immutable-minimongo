var mm = require('./minimongo.js');
var lmm = require('./minimongo_legacy.js');

module.exports = {
  Minimongo: mm.Minimongo,
  LocalCollection: mm.LocalCollection,
  MinimongoTest: mm.MinimongoTest,
  ReactiveDict: mm.ReactiveDict,
  ReactiveVar: mm.ReactiveVar,
  Tracker: mm.Tracker,
  MongoID: mm.MongoID,
  MinimongoError: mm.MinimongoError,
  EJSON: mm.EJSON,
  LegacyMinimongo: lmm.Minimongo,
  LegacyLocalCollection: lmm.LocalCollection
};

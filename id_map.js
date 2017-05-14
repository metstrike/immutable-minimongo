var global = Function('return this')();
var MongoID = require('metstrike-mongo-id');
var IdMap = require('metstrike-id-map');

function setIdMap(LocalCollection, Meteor){

LocalCollection._IdMap = function () {
  var self = this;
  IdMap.call(self, MongoID.idStringify, MongoID.idParse);
};

Meteor._inherits(LocalCollection._IdMap, IdMap);

}

if(global.Meteor && global.LocalCollection){setIdMap(LocalCollection, Meteor);}

module.exports = setIdMap;


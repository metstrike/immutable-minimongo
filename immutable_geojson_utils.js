var _ = require('./immutable_underscore.js');

var Gju = {};

Gju.numberToRadius = function (number) {
  return number * Math.PI / 180;
};

// from http://www.movable-type.co.uk/scripts/latlong.html
Gju.pointDistance = function (pt1, pt2) {
  var lon1 = _.get(_.get(pt1, 'coordinates'), 0),
    lat1 = _.get(_.get(pt1, 'coordinates'), 1),
    lon2 = _.get(_.get(pt2, 'coordinates'), 0),
    lat2 = _.get(_.get(pt2, 'coordinates'), 1),
    dLat = Gju.numberToRadius(lat2 - lat1),
    dLon = Gju.numberToRadius(lon2 - lon1),
    a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(Gju.numberToRadius(lat1))
      * Math.cos(Gju.numberToRadius(lat2)) * Math.pow(Math.sin(dLon / 2), 2),
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Earth radius is 6371 km
  return (6371 * c) * 1000; // returns meters
};

// checks if geometry lies entirely within a circle
// works with Point, LineString, Polygon
Gju.geometryWithinRadius = function (geometry, center, radius) {
  if (_.get(geometry, 'type') == 'Point') {
    return Gju.pointDistance(geometry, center) <= radius;
  } else if (_.get(geometry, 'type') == 'LineString' || _.get(geometry, 'type') == 'Polygon') {
    var point = {};
    var coordinates;
    if (_.get(geometry, 'type') == 'Polygon') {
      // it's enough to check the exterior ring of the Polygon
      coordinates = _.get(_.get(geometry, 'coordinates'), 0);
    } else {
      coordinates = _.get(geometry, 'coordinates');
    }
    _.each(coordinates, function(value) {
      point.coordinates = value;
      if (Gju.pointDistance(point, center) > radius) {
        return false;
      }
      return true;
    });
  }
  return true;
};


module.exports = Gju;

var _       = require('underscore');
var express = require('express');
var Brand   = require('../models/brand');

var router = express.Router();

router.get('/', function(req, res, next) {
    Brand.all(function(err, brands) {
        if (err) {
            return next(err);
        }
        res.render('index', { brands_by_letter: _.groupBy(brands, function(brand) {
            return _.first(brand.normalized_name).replace(/[0-9]/, '0-9');
        }) });
    });
});

router.get('/collection', function(req, res) {
    res.send('boo');
});

router.get('/[A-Za-z0-9]+', function(req, res, next) {
    Brand.all(function(err, brands) {
        if (err) {
            return next(err);
        }
        var brand = _.findWhere(brands, { normalized_name: req.path.toLowerCase().substring(1) });
        if (!brand) {
            return next();
        }
        res.render('index', { brand: brand, brands_by_letter: _.groupBy(brands, function(brand) {
            return _.first(brand.normalized_name).replace(/[0-9]/, '0-9');
        }) });
    });
});

module.exports = router;

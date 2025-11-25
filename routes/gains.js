const express = require('express');
const faker = require('faker');
const calculate = require('../utils/calculate');

const router = express.Router();

router.get('/', async function(req, res, next) {
  const gains = faker.finance.amount(100000, 500000, 2);
  calculate();
  res.send({gains});
});

module.exports = router;

const express = require('express');
const faker = require('faker');
const calculate = require('../utils/calculate');

const router = express.Router();

router.get('/', async function(req, res, next) {
  const deposits = faker.finance.amount(500000, 5000000, 2);
  calculate();
  res.send({deposits});
});

module.exports = router;

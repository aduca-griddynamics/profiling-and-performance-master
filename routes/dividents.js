const express = require('express');
const faker = require('faker');
const calculate = require('../utils/calculate');

const router = express.Router();

router.get('/', async function(req, res, next) {
  const dividents = faker.finance.amount(10000, 100000, 2);
  calculate();
  res.send({dividents});
});

module.exports = router;

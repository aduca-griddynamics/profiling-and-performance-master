const express = require('express');
const router = express.Router();
const faker = require('faker');

router.get('/', function(req, res, next) {
  const rows = Number(req.query.rows) || 1000;
  const operations = [];
  for (let i = 0; i <rows; i++) {
    operations.push( {
      id: faker.random.number(rows * 10),
      user: faker.internet.userName(),
      type: faker.random.arrayElement(['sell', 'buy']),
      amount: faker.finance.amount(100, 10000)
    });
  }
  res.send({operations})
});

module.exports = router;

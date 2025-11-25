const express = require('express');
const router = express.Router();
const faker = require('faker');

router.get('/', function(req, res, next) {
  const rows = Number(req.query.rows) || 1000;
  const users = [];
  for (let i = 0; i <rows; i++) {
    users.push( {
      id: faker.random.number(rows * 10),
      name: faker.internet.userName(),
      level: faker.random.arrayElement(['novice', 'middle', 'advanced']),
      status: faker.random.arrayElement(['active', 'inactive']),
      registered: faker.date.past(5),
      currentEarnings: faker.finance.amount(50, 1000)
    });
  }
  res.send({users})
});

module.exports = router;

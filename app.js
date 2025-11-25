const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const depositsRouter = require('./routes/deposits');
const dividentsRouter = require('./routes/dividents');
const gainsRouter = require('./routes/gains');
const operationsRouter = require('./routes/operations');
const usersRouter = require('./routes/users');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const apiRouter = express.Router();
app.use('/api', apiRouter);
apiRouter.use('/deposits', depositsRouter);
apiRouter.use('/dividents', dividentsRouter);
apiRouter.use('/gains', gainsRouter);
apiRouter.use('/operations', operationsRouter);
apiRouter.use('/users', usersRouter);

module.exports = app;

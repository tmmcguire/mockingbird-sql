//  mockingbird-sql: Simple SQL statement builder
//
//  Copyright (C) 2018 Tommy M. McGuire
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
//  General Public License for more details.
//
//  You should have received a copy of the GNU General
//  Public License along with this program. If not, see
//  <https://www.gnu.org/licenses/>.

'use strict';

const expressions = require('./expressions');
const mysql       = require('./mysql');
const oracle      = require('./oracle');

Object.assign(module.exports, expressions);

module.exports.mysql  = mysql;
module.exports.oracle = oracle;

// ==========================

function Statement() {
  this.properties = { };
}

// ==========================

function Select() {
  Statement.call(this);
}

// Properties:
// - columns  - list of [column: string, alias: string]
// - distinct - boolean flag
// - from     - list of [table: string, alias: string]
// - join     - list of Join objects
// - where    - string | Expression
// - having   - string | Expression
// - groupBy  - list of strings
// - orderBy  - list of [column: string, order: string]
// - limit    - number
// - offset   - number
//
// Join object:
// - table - string
// - on    - string | Expression
// - alias - string
// - type  - SQL JOIN operator: string

// --------------------------

Select.prototype.columns = function() {
  let cols = argsToAry(arguments).map((arg) => {
    if (Array.isArray(arg)) {
      return arg;
    } else {
      return [arg, null];
    }
  });
  this.properties.columns = append(
    this.properties.columns || [],
    cols
  );
  return this;
};

// --------------------------

Select.prototype.distinct = function(state = true) {
  this.properties.distinct = state;
  return this;
};

// --------------------------

Select.prototype.from = function(table, alias = null) {
  this.properties.from = append(
    this.properties.from || [],
    [[table, alias]]
  );
  return this;
};

// --------------------------

Select.prototype._doJoin = function(type, tableInfo) {
  let [table, on, alias = null] = tableInfo;
  switch (type) {
    case 'join':
    case 'innerJoin':
      type = 'INNER JOIN';
      break;
    case 'leftJoin':
    case 'leftOuterJoin':
      type = 'LEFT OUTER JOIN';
      break;
    case 'rightJoin':
    case 'rightOuterJoin':
      type = 'RIGHT OUTER JOIN';
      break;
    case 'fullJoin':
    case 'fullOuterJoin':
      type = 'FULL JOIN';
      break;
    default:
      throw 'unimplemented join method: ' + type;
  }
  this.properties.join = append(
    this.properties.join || [],
    [{
      table: table,
      on:    Array.isArray(on) ? (on[0] + ' = ' + on[1]) : on,
      alias: alias,
      type:  type,
    }]
  );
  return this;
};

[
  'join',      'innerJoin',
  'leftJoin',  'leftOuterJoin',
  'rightJoin', 'rightOuterJoin',
  'fullJoin',  'fullOuterJoin',
].forEach((type) => {
  Select.prototype[type] = function () {
    return this._doJoin(type, arguments);
  };
});

// --------------------------

Select.prototype.where = function (expression) {
  this.properties.where = expression;
  return this;
};

Select.prototype.whereAnd = function (expression) {
  if (this.properties.where) {
    this.properties.where = expressions.and(this.properties.where, expression);
  } else {
    this.properties.where = expression;
  }
  return this;
};

Select.prototype.whereOr = function (expression) {
  if (this.properties.where) {
    this.properties.where = expressions.or(this.properties.where, expression);
  } else {
    this.properties.where = expression;
  }
  return this;
};

// --------------------------

Select.prototype.having = function (expression) {
  this.properties.having = expression;
  return this;
};

// --------------------------

Select.prototype.groupBy = function (column) {
  this.properties.groupBy = append(
    this.properties.groupBy || [],
    [column]
  );
  return this;
};

// --------------------------

Select.prototype.orderBy = function (column, direction = 'ASC') {
  return _orderBy(this, column, direction);
};

// --------------------------

Select.prototype.limit  = function (rows) { return _limit(this, rows) };
Select.prototype.offset = function (rows) { return _offset(this, rows) };
Select.prototype.window = function (offset, limit) {
  return _window(this, offset, limit);
};

// ==========================

function Union(selects) {
  Statement.call(this);
  if (selects.length > 0) {
    this.selects = append(
      this.selects || [],
      argsToAry(selects)
    );
  }
}

Union.prototype.add = function () {
  this.selects = append(
    this.selects || [],
    argsToAry(arguments)
  );
  return this;
};

// --------------------------

Union.prototype.orderBy = function (column, direction = 'ASC') {
  return _orderBy(this, column, direction);
};

Union.prototype.limit  = function (rows) { return _limit(this, rows) };
Union.prototype.offset = function (rows) { return _offset(this, rows) };
Union.prototype.window = function (offset, limit) {
  return _window(this, offset, limit);
};

// ==========================

function _orderBy(object, column, direction = 'ASC') {
  direction = direction.toUpperCase();
  if (direction !== 'ASC' && direction !== 'DESC') {
    throw 'illegal sort direction: ' + direction;
  }
  object.properties.orderBy = append(
    object.properties.orderBy || [],
    [[column, direction]]
  );
  return object;
}

function _limit(object, rows) {
  object.properties.limit = rows;
  return object;
}

function _offset(object, rows) {
  object.properties.offset = rows;
  return object;
}

function _window(object, offset, limit) {
  object.limit(limit);
  object.offset(offset);
  return object;
}

// --------------------------

function argsToAry(args) {
  if (args.length === 1 && Array.isArray(args[0])) {
    return args[0];
  } else {
    // let ary = [];
    // for (let i = 0; i < args.length; ++i) {
    //   ary.push(args[i]);
    // }
    return Array.from(args);
  }
}

// --------------------------

function append(ary1, ary2) {
  for (let i = 0; i < ary2.length; ++i) {
    ary1.push(ary2[i]);
  }
  return ary1;
}

// ==========================

function alias(object, alias = null) { return [object, alias] }

// ==========================

[
  Select,
  Union
].forEach(stmt => {
  stmt.prototype = Object.assign(
    Object.create(Statement.prototype),
    stmt.prototype
  );
  stmt.prototype.constructor = stmt;
});

module.exports.Statement = Statement;
module.exports.Select    = Select;
module.exports.Union     = Union;

module.exports.select = function ()           { return new Select() };
module.exports.union  = function (...selects) { return new Union(selects)  };

module.exports.alias  = alias;
module.exports.column = alias;

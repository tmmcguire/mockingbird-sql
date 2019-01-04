//  mockingbird-sql: Simple SQL statement builder
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

function Expression() { }

// --------------------------

function LogicalOperator(operator, operands) {
  Expression.call(this);
  this.operator = operator;
  this.operands = Array.from(operands);
}

LogicalOperator.prototype.push = function(expression) {
  this.operands.push(expression);
};

// --------------------------

function NotOperator(expression) {
  Expression.call(this);
  this.expression = expression;
}

// ==========================

function UnaryOperator(operator) {
  Expression.call(this);
  return _setInheritance(function (operand) {
    this.operator = operator;
    this.operand  = operand;
  }, UnaryOperator.prototype);
}

function BinaryOperator(operator) {
  Expression.call(this);
  return _setInheritance(function (column, value) {
    this.operator = operator;
    this.column   = column;
    this.value    = value;
  }, BinaryOperator.prototype);
}

function TrinaryOperator(operator, separator) {
  Expression.call(this);
  return _setInheritance(function (column, left, right) {
    this.operator  = operator;
    this.separator = separator;
    this.column    = column;
    this.left      = left;
    this.right     = right;
  }, TrinaryOperator.prototype);
}

// --------------------------

function CaseOperator(expression) {
  Expression.call(this);
  this.expression = expression;
  this.branches   = [];
  this.default    = null;
}

CaseOperator.prototype.when = function (expression, result = null) {
  this.branches.push([expression, result]);
  return this;
};

CaseOperator.prototype.then = function (result) {
  this.branches[this.branches.length - 1][1] = result;
  return this;
};

CaseOperator.prototype.else = function (result) {
  this.default = result;
  return this;
};

// ==========================

function _setInheritance(cnstr, proto) {
  cnstr.prototype = Object.assign(
    Object.create(proto),
    cnstr.prototype
  );
  cnstr.prototype.constructor = cnstr;
  return cnstr;
}

[
  LogicalOperator,
  NotOperator,
  UnaryOperator,
  BinaryOperator,
  CaseOperator,
].forEach((ex) => { _setInheritance(ex, Expression.prototype) });

// --------------------------

[
  Expression,
  LogicalOperator,
  NotOperator,
  UnaryOperator,
  BinaryOperator,
  TrinaryOperator,
  CaseOperator,
].forEach((op) => module.exports[op.name] = op);

['AND', 'OR'].forEach((op) => {
  module.exports[op.toLowerCase()] = function () {
    return new LogicalOperator(op, arguments);
  };
});

module.exports.not = function (expr) { return new NotOperator(expr) };

[
  ['isNull',    UnaryOperator('IS NULL')],
  ['isNotNull', UnaryOperator('IS NOT NULL')],
].forEach(([name,fcn]) => {
  module.exports[name] = function (column) { return new fcn(column) };
});

[
  ['eq',   BinaryOperator('=')],
  ['neq',  BinaryOperator('!=')],
  ['gt',   BinaryOperator('>')],
  ['lt',   BinaryOperator('<')],
  ['gteq', BinaryOperator('>=')],
  ['lteq', BinaryOperator('<=')],
  ['like', BinaryOperator('LIKE')],
  ['in',   BinaryOperator('IN')],
].forEach(([name, fcn]) => {
  module.exports[name] = function (column, value) {
    return new fcn(column, value);
  };
});

[
  ['between',    TrinaryOperator('BETWEEN', 'AND')],
  ['notBetween', TrinaryOperator('NOT BETWEEN', 'AND')],
].forEach(([name,fcn]) => {
  module.exports[name] = function (column, left, right) {
    return new fcn(column, left, right);
  };
});

module.exports.case = function (expr) { return new CaseOperator(expr) };

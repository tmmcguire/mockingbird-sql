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

const sql = require('./lib.js');
const ex  = require('./expressions');

function BaseSql() { }

module.exports.BaseSql = BaseSql;

// ==========================

BaseSql.prototype.toSql = function (stmt, opts = { values: [] }) {
  if (! (stmt instanceof sql.Statement)) {

    throw `not a statement: ${ JSON.stringify(stmt, null, '  ') }`;

  } else if (stmt instanceof sql.Select) {

    return this.selectToSql(stmt, opts);

  } else if (stmt instanceof sql.Union) {

    return this.unionToSql(stmt, opts);

  } else {

    throw `unknown statement: ${ JSON.stringify(stmt, null, '  ') }`;

  }
};

// ==========================

BaseSql.prototype.selectToSql = function (stmt, opts) {
  let distinct = this.distinctToSql(stmt, opts);
  let columns  = this.columnsToSql( stmt, opts);
  let from     = this.fromToSql(    stmt, opts);
  let join     = this.joinToSql(    stmt, opts);
  let where    = this.whereToSql(   stmt, opts);
  let groupBy  = this.groupByToSql( stmt, opts);
  let orderBy  = this.orderByToSql( stmt, opts);
  let window   = this.windowToSql(  stmt, opts);

  let tbls     = `${from} ${join}`;
  let order    = `${groupBy} ${orderBy}`;

  let sql = `SELECT ${distinct} ${columns} ${tbls} ${where} ${order} ${window}`;
  return {
    sql:    sql.trim(),
    values: opts.values,
  };
};

// --------------------------

BaseSql.prototype.distinctToSql = function (stmt, _opts) {
  return stmt.properties.distinct ? 'DISTINCT' : '';
};

BaseSql.prototype.columnsToSql = function (stmt, opts) {
  let columns = stmt.properties.columns;
  if (!columns || columns.length === 0) { return '*' }
  return columns.map(([col, alias]) => {
    let expr = (col instanceof ex.Expression) ? this.exprToSql(col, opts) : col;
    return (alias) ? `${expr} AS ${alias}` : expr;
  }).join(', ');
};

BaseSql.prototype.tableAliasToSql = function (table, alias) {
  return `${table} AS ${alias}`;
};

BaseSql.prototype.fromToSql = function (stmt, opts) {
  let from   = stmt.properties.from || [];
  let result = [];
  for (let [tbl,alias] of from) {
    if (tbl instanceof sql.Statement) {
      tbl = `(${ this.toSql(tbl, opts).sql })`;
    }
    result.push((alias) ? this.tableAliasToSql(tbl, alias) : tbl);
  }
  return 'FROM ' + result.join(', ');
};

BaseSql.prototype.joinToSql = function (stmt, opts) {
  let join   = stmt.properties.join || [];
  let result = [];
  for (let obj of join) {
    let type  = obj.type;
    let table = obj.table;
    let onExp = obj.on;
    let alias = obj.alias;

    if (table instanceof sql.Statement) {
      table = `(${ this.toSql(table, opts).sql })`;
    }

    if (onExp instanceof sql.Expression) {
      onExp = this.exprToSql(onExp, opts);
    }

    if (alias) {
      let tableRef = this.tableAliasToSql(table, alias);
      result.push( `${ type } ${ tableRef } ON (${ onExp })` );
    } else {
      result.push( `${ type } ${ table } ON (${ onExp })` );
    }
  }
  return result.join(' ');
};

BaseSql.prototype.whereToSql = function (stmt, opts) {
  let where = stmt.properties.where || stmt.properties.having;
  if (!where) {
    return '';
  } else if (where instanceof sql.Expression) {
    return `WHERE (${ this.exprToSql(where, opts) })`;
  } else {
    return `WHERE (${ where })`;
  }
};

BaseSql.prototype.groupByToSql = function (stmt, _opts) {
  if (stmt.properties.groupBy) {
    return `GROUP BY ${ stmt.properties.groupBy.join(', ') }`;
  } else {
    return '';
  }
};

BaseSql.prototype.orderByToSql = function (stmt, _opts) {
  let orderBy = stmt.properties.orderBy;
  if (orderBy) {
    let order = orderBy.map(([col,ord]) => `${col} ${ord}`).join(', ');
    return `ORDER BY ${order}`;
  } else {
    return '';
  }
};

BaseSql.prototype.windowToSql = function (stmt, opts) {
  let limit = stmt.properties.limit;
  if (limit) {
    let s = 'LIMIT ' + this.parameterToSql(limit, opts);
    let offset = stmt.properties.offset;
    if (offset) {
      s += ' OFFSET ' + this.parameterToSql(offset, opts);
    }
    return s;
  } else {
    return '';
  }
};

// ==========================

BaseSql.prototype.unionToSql = function (stmt, opts) {
  let statement = [
    stmt.selects.map((select) => {
      if (select instanceof sql.Select) {
        return '(' + this.selectToSql(select, opts).sql + ')';
      } else {
        return '(' + select + ')';
      }
    }).join(' UNION '),
    this.orderByToSql(stmt, opts),
    this.windowToSql(stmt, opts),
  ]
    .filter((clause) => clause && clause.length > 0)
    .join(' ');
  return {
    sql: statement,
    values: opts.values,
  };
};

// ==========================

BaseSql.prototype.exprToSql = function (expr, opts) {
  if (expr instanceof ex.LogicalOperator) {

    return expr.operands
      .map(exp => `(${ this.exprToSql(exp, opts) })`)
      .join(` ${ expr.operator } `);

  } else if (expr instanceof ex.NotOperator) {

    return `NOT (${ this.exprToSql(expr.expression, opts) })`;

  } else if (expr instanceof ex.UnaryOperator) {

    return `${ expr.operator } (${ this.exprToSql(expr.operand, opts) })`;

  } else if (expr instanceof ex.BinaryOperator) {

    return `${ expr.column } ${ expr.operator } ${ this.parameterToSql(expr.value, opts) }`;

  } else if (expr instanceof ex.TrinaryOperator) {

    return `${ expr.column } ${ expr.operator } ${ this.parameterToSql(expr.left, opts) } ${ expr.separator } ${ this.parameterToSql(expr.right, opts) }`;

  } else if (expr instanceof ex.CaseOperator) {

    return this.caseExprToSql(expr, opts);

  } else if (typeof expr === 'string') {

    return expr;

  }
};

BaseSql.prototype.parameterToSql = function (value, opts) {
  opts.values.push(value);
  return '?';
};

// --------------------------

BaseSql.prototype.caseExprToSql = function (expr, opts) {

  let expression = expr.expression ? this.exprToSql(expr.expression, opts) : '';
  let branches   = expr.branches.map(([pred, result]) =>
    `WHEN ${ this.exprToSql(pred, opts) } THEN ${ this.exprToSql(result, opts) }`
  ).join('\n');
  let elseExpr   = expr.default ? ` ELSE ${ this.exprToSql(expr.default, opts) }` : '';

  return `
    (CASE ${ expression }
      ${ branches }
      ${ elseExpr }
    END)
  `;
};

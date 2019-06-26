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
const baseSql = require('./base-sql');

function OracleSql() {
  baseSql.BaseSql.call(this);
}

OracleSql.prototype = Object.create(baseSql.BaseSql.prototype);
OracleSql.prototype.constructor = OracleSql;

OracleSql.prototype.selectToSql = function (stmt, opts = { values: [] }) {
  let distinct = this.distinctToSql(stmt, opts);
  let columns  = this.columnsToSql( stmt, opts);
  let from     = this.fromToSql(    stmt, opts);
  let join     = this.joinToSql(    stmt, opts);
  let where    = this.whereToSql(   stmt, opts);
  let groupBy  = this.groupByToSql( stmt, opts);
  let orderBy  = this.orderByToSql( stmt, opts);

  let tbls     = `${from} ${join}`;
  let order    = `${groupBy} ${orderBy}`;

  let sql = `SELECT ${distinct} ${columns} ${tbls} ${where} ${order}`;

  let offset = stmt.properties.offset;
  let limit = stmt.properties.limit;
  if (offset && limit) {
    let total = offset + limit;
    sql = `SELECT * FROM (SELECT cinternal_query.*, ROWNUM rnum FROM (${sql}) cinternal_query) WHERE (rnum > ${offset}) AND (rnum <= (${total}))`;
  } else if (offset) {
    sql = `SELECT cinternal_query.* FROM (${sql}) cinternal_query WHERE ROWNUM >= ${offset}`;
  } else if (limit) {
    sql = `SELECT cinternal_query.* FROM (${sql}) cinternal_query WHERE ROWNUM <= ${limit}`;
  }

  return {
    sql:    sql.trim(),
    values: opts.parameters,
  };
};

OracleSql.prototype.unionToSql = function (stmt, opts) {
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
    values: opts.parameters,
  };
};

OracleSql.prototype.tableAliasToSql = function (table, alias) {
  return `${table} ${alias}`;
};

OracleSql.prototype.parameterToSql = function (value, opts) {
  if (!opts.parameterCount) {
    opts.parameterCount = 0;
    opts.parameters = { };
  }
  opts.parameterCount += 1;
  let par = 'par' + opts.parameterCount;
  opts.parameters[par] = value;
  return ':' + par;
};

module.exports.Oracle = new OracleSql();

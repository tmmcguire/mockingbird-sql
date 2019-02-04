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

const baseSql = require('./base-sql');

function MySql() {
  baseSql.BaseSql.call(this);
}

MySql.prototype = Object.create(baseSql.BaseSql.prototype);
MySql.prototype.constructor = MySql;

module.exports.MySql = new MySql();

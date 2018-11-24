'use strict';

const assert = require('assert');
let a   = assert;
let aEq = assert.deepStrictEqual;

const ms = require('./lib.js');

const mysql = ms.mysql.MySql;

let stmt = new ms.Select();
a(stmt instanceof ms.Statement);
a(stmt instanceof ms.Select);
aEq(stmt.properties, {});
a( /SELECT\s+\*/.test( mysql.toSql(stmt).sql) );

stmt.columns('columnA', 'columnB');
stmt.columns(['columnC']);
stmt.columns([['columnD', 'myD']]);
aEq(stmt.properties, {
  "columns": [
   [ "columnA", null ],
   [ "columnB", null ],
   [ "columnC", null ],
   [ "columnD", "myD" ]
  ]});
a(/SELECT\s+columnA, columnB, columnC, columnD AS myD/
  .test( mysql.toSql(stmt).sql ));

stmt = ms.select().distinct();
aEq(stmt.properties, { "distinct": true });
a(/SELECT DISTINCT\s+\*/
  .test( mysql.toSql(stmt).sql ));

stmt = ms.select().from('tableA').from('tableB', 'myB');
aEq(stmt.properties, {
  "from": [[ "tableA", null ],
   [ "tableB", "myB" ]
  ]});
a(/SELECT\s+\*\s+FROM\s+tableA, tableB AS myB/
  .test( mysql.toSql(stmt).sql ));

stmt = ms.select()
  .from('tableA')
  .join('tableB', 'tableA.a = tableB.a')
  .join('tableC', ['tableB.c', 'tableC.c'], 'myC');
aEq(stmt.properties, {
  "from": [ [ "tableA", null ] ],
  "join": [
    {
      "table": "tableB",
      "on": "tableA.a = tableB.a",
      "alias": null,
      "type": "INNER JOIN"
   },
   {
      "table": "tableC",
      "on": "tableB.c = tableC.c",
      "alias": "myC",
      "type": "INNER JOIN"
   }
  ]
 });

a(ms.and('a = b', 'c = d') instanceof ms.Expression);
a(ms.and('a = b', 'c = d') instanceof ms.LogicalOperator);

stmt = ms.select()
  .from('tableA')
  .where(
    ms.and(
      'a = 44',
      ms.eq('b', 12)
    )
  );
console.log( mysql.toSql(stmt) );

stmt = ms.select()
  .from('tableA', 'myA')
  .orderBy('columnA')
  .orderBy('columnB', 'desc');
a(stmt.properties, {
  "orderBy": [
    [ "columnA", "ASC" ],
    [ "columnB", "DESC" ]
  ]
 });
console.log( mysql.toSql(stmt) );

stmt = ms.select()
  .from('tableA')
  .offset(10)
  .limit(20);
console.log( mysql.toSql(stmt) );

console.log('Done');

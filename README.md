# mockingbird-sql
SQL statement builder

## NAME

mockingbird-sql - A simple SQL statement builder

## SYNOPSIS

```js
const sql = require('mockingbird-sql');

let s = sql.select().columns([
  'ColA',
  'ColB',
  'ColC',
]).from('tableA')
  .leftOuterJoin('tableB', 'tableA.ColB = tableB.ColB', 'aliasB')
  .where(
    sql.and(
      'tableA.ColA like \'%value%\'',
      sql.lt('aliasb.ColX', 27)
    )
  ).orderBy('ColA');

let query = sql.mysql.MySql.toSql(s);

// query.sql    => SQL statement
// query.values => list of arguments
```

## DESCRIPTION

This module exports several kinds of functions useful for building complex
SQL queries programmatically.

The major class are constructors for SQL statement objects. Another is functions
for building SQL expressions. The third is classes for converting the statement
objects into SQL suitable for passing to database drivers in order to execute
the query.

### SQL Statement Objects

Currently, two statements are supported: SELECT and UNION. Others can be added
as necessary.

#### SELECT

Constructor: _module_.select(): _SELECT statement object_

Methods:

All methods return the *this* object, to allow chaining.

* s.columns( _columns_ )

* s.distinct( bool )

* s.from( _table_, _alias_ )

* s.join( _table_, _on_, _alias )

* s.where( _expression_ )

  - s.whereAnd( _expression_ )

  - s.whereOr( _expression_ )

* s.groupBy( _column_ )

* s.orderBy( _column_, _direction_ )

* s.limit( _rows_ )

* s.offset( _rows )

* s.window( _offset_, _limit_ )

#### UNION

Constructor: _module_.union(): _UNION statement object_

Methods:

* u.add( _statements_ )

* u.orderBy( _column_, _direction_ )

* u.limit( _rows_ )

* u.offset( _rows )

* u.window( _offset_, _limit_ )

### Expressions

#### Logical operators

* _module_.and( _expression_, _expression_ )

* _module_.or( _expression_, _expression_ )

* _module_.not( _expression_, _expression_ )

#### Unary operators

* _module_.isNull( _expression_ )

* _module_.isNotNull( _expression_ )

#### Binary operators

* _module_._op_( _column_, _value_ )

Operators are:

  - eq
  - neq
  - gt
  - lt
  - gteq
  - lteq
  - like
  - in

#### Trinary Operators

* _module_.between( _column_, _left-value_, _right-value_ )

* _module_.notBetween( _column_, _left-value_, _right-value_ )

#### Case operator

* _module_.case( _expression_ )

The Case object has a number of methods:

  - c.when( _expression_, _result_ = null )

    If _result_ is null, use the `then` method below to specifiy the result of
    the branch.

  - c.then( _result_ )

  - c.else( _result_ )

### Conversion

This module is intended to support any (semi-) standardized SQL. Currently,
it supports MySQL. The currently supported options are:

#### MySQL

Conversion of a generated statement to MySQL is handled by the `mysql.MySQL`
object. Methods on this object are:

* mysql.MySQL.toSql( _statement_ )

  This method returns an object containing two keys:

  - sql: A string representation of the SQL query, with placeholders for parameters.
  - values: A list of arguments for the query.

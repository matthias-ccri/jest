/*
Copyright (c) 2008-2016 Pivotal Labs

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

/* eslint-disable */

import type {Tester} from './types';

export type EqualsFunction = (
  a: unknown,
  b: unknown,
  customTesters?: Array<Tester>,
  strictCheck?: boolean,
) => boolean;

// Extracted out of jasmine 2.5.2
export const equals: EqualsFunction = (a, b, customTesters, strictCheck) => {
  customTesters = customTesters || [];
  return eq(a, b, [], [], customTesters, strictCheck);
};

function isAsymmetric(obj: any) {
  return !!obj && isA('Function', obj.asymmetricMatch);
}

function asymmetricMatch(a: any, b: any) {
  var asymmetricA = isAsymmetric(a),
    asymmetricB = isAsymmetric(b);

  if (asymmetricA && asymmetricB) {
    return undefined;
  }

  if (asymmetricA) {
    return a.asymmetricMatch(b);
  }

  if (asymmetricB) {
    return b.asymmetricMatch(a);
  }
}

// Equality function lovingly adapted from isEqual in
//   [Underscore](http://underscorejs.org)
function eq(
  a: any,
  b: any,
  aStack: Array<unknown>,
  bStack: Array<unknown>,
  customTesters: Array<Tester>,
  strictCheck: boolean | undefined,
): boolean {
  var result = true;

  var asymmetricResult = asymmetricMatch(a, b);
  if (asymmetricResult !== undefined) {
    return asymmetricResult;
  }

  for (var i = 0; i < customTesters.length; i++) {
    var customTesterResult = customTesters[i](a, b);
    if (customTesterResult !== undefined) {
      return customTesterResult;
    }
  }

  if (a instanceof Error && b instanceof Error) {
    return a.message == b.message;
  }

  if (Object.is(a, b)) {
    return true;
  }
  // A strict comparison is necessary because `null == undefined`.
  if (a === null || b === null) {
    return a === b;
  }
  var className = Object.prototype.toString.call(a);
  if (className != Object.prototype.toString.call(b)) {
    return false;
  }
  switch (className) {
    case '[object Boolean]':
    case '[object String]':
    case '[object Number]':
      if (typeof a !== typeof b) {
        // One is a primitive, one a `new Primitive()`
        return false;
      } else if (typeof a !== 'object' && typeof b !== 'object') {
        // both are proper primitives
        return Object.is(a, b);
      } else {
        // both are `new Primitive()`s
        return Object.is(a.valueOf(), b.valueOf());
      }
    case '[object Date]':
      // Coerce dates to numeric primitive values. Dates are compared by their
      // millisecond representations. Note that invalid dates with millisecond representations
      // of `NaN` are not equivalent.
      return +a == +b;
    // RegExps are compared by their source patterns and flags.
    case '[object RegExp]':
      return a.source === b.source && a.flags === b.flags;
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  // Use DOM3 method isEqualNode (IE>=9)
  if (isDomNode(a) && isDomNode(b)) {
    return a.isEqualNode(b);
  }

  // Used to detect circular references.
  var length = aStack.length;
  while (length--) {
    // Linear search. Performance is inversely proportional to the number of
    // unique nested structures.
    // circular references at same depth are equal
    // circular reference is not equal to non-circular one
    if (aStack[length] === a) {
      return bStack[length] === b;
    } else if (bStack[length] === b) {
      return false;
    }
  }
  // Add the first object to the stack of traversed objects.
  aStack.push(a);
  bStack.push(b);
  // Recursively compare objects and arrays.
  // Compare array lengths to determine if a deep comparison is necessary.
  if (strictCheck && className == '[object Array]' && a.length !== b.length) {
    return false;
  }

  // Deep compare objects.
  var aKeys = keys(a, hasKey),
    key;

  var bKeys = keys(b, hasKey);
  // Add keys corresponding to asymmetric matchers if they miss in non strict check mode
  if (!strictCheck) {
    for (var index = 0; index !== bKeys.length; ++index) {
      key = bKeys[index];
      if ((isAsymmetric(b[key]) || b[key] === undefined) && !hasKey(a, key)) {
        aKeys.push(key);
      }
    }
    for (var index = 0; index !== aKeys.length; ++index) {
      key = aKeys[index];
      if ((isAsymmetric(a[key]) || a[key] === undefined) && !hasKey(b, key)) {
        bKeys.push(key);
      }
    }
  }

  // Ensure that both objects contain the same number of properties before comparing deep equality.
  var size = aKeys.length;
  if (bKeys.length !== size) {
    return false;
  }

  while (size--) {
    key = aKeys[size];

    // Deep compare each member
    if (strictCheck)
      result =
        hasKey(b, key) &&
        eq(a[key], b[key], aStack, bStack, customTesters, strictCheck);
    else
      result =
        (hasKey(b, key) || isAsymmetric(a[key]) || a[key] === undefined) &&
        eq(a[key], b[key], aStack, bStack, customTesters, strictCheck);

    if (!result) {
      return false;
    }
  }
  // Remove the first object from the stack of traversed objects.
  aStack.pop();
  bStack.pop();

  return result;
}

function keys(obj: object, hasKey: (obj: object, key: string) => boolean) {
  var keys = [];
  for (var key in obj) {
    if (hasKey(obj, key)) {
      keys.push(key);
    }
  }
  return keys.concat(
    (Object.getOwnPropertySymbols(obj) as Array<any>).filter(
      symbol =>
        (Object.getOwnPropertyDescriptor(obj, symbol) as PropertyDescriptor)
          .enumerable,
    ),
  );
}

function hasKey(obj: any, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isA(typeName: string, value: unknown) {
  return Object.prototype.toString.apply(value) === '[object ' + typeName + ']';
}

function isDomNode(obj: any): boolean {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.nodeType === 'number' &&
    typeof obj.nodeName === 'string' &&
    typeof obj.isEqualNode === 'function'
  );
}

// SENTINEL constants are from https://github.com/facebook/immutable-js
const IS_KEYED_SENTINEL = '@@__IMMUTABLE_KEYED__@@';
const IS_SET_SENTINEL = '@@__IMMUTABLE_SET__@@';
const IS_ORDERED_SENTINEL = '@@__IMMUTABLE_ORDERED__@@';

export function isImmutableUnorderedKeyed(maybeKeyed: any) {
  return !!(
    maybeKeyed &&
    maybeKeyed[IS_KEYED_SENTINEL] &&
    !maybeKeyed[IS_ORDERED_SENTINEL]
  );
}

export function isImmutableUnorderedSet(maybeSet: any) {
  return !!(
    maybeSet &&
    maybeSet[IS_SET_SENTINEL] &&
    !maybeSet[IS_ORDERED_SENTINEL]
  );
}

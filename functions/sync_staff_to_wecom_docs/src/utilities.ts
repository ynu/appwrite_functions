/**
 * check if the object is null or undefined or empty object
 * @param obj the object to check
 * @returns true if the object is null or undefined or empty object, otherwise false
 *
 * @example
 * ```typescript
 * const obj = null;
 * const result = is_null_or_undefined_or_empty_object(obj);
 * console.log(result); // true
 * ```
 */
export function is_null_or_undefined_or_empty_object(obj: any) {
  return obj === null || obj === undefined || Object.keys(obj).length === 0;
}

/**
 * render a template string with locals
 * inspired by https://github.com/dondido/express-es6-template-engine
 * @param expr the template string
 * @param locals the locals to render the template with
 * @returns the rendered template
 *
 * @example
 * ```typescript
 * const expr = 'Hello ${name}!';
 * const locals = { name: 'World' };
 * const result = template(expr, locals);
 * console.log(result); // Hello World!
 * ```
 */
export function template(expr: string, locals: { [key: string]: any }): string {
  const localsKeys = Object.keys(locals);
  const localsValues = localsKeys.map((i) => locals[i]);
  try {
    const compile = (expr: string, args: string | string[]) => Function(...args, 'return `' + expr + '`;');
    const result = compile(expr, localsKeys)(...localsValues);
    return result;
  } catch (err: any) {
    console.error(err);
    return err.message;
  }
}

/**
 * remove fields which values is null or undefined from an object
 * @param obj the object to remove null or undefined values from
 * @returns the object without null or undefined values
 *
 * @example
 * ```typescript
 * const obj = { a: 1, b: null, c: undefined };
 * const result = remove_null_undefined_values(obj);
 * console.log(result); // { a: 1 }
 * ```
 */
export function remove_null_undefined_values<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

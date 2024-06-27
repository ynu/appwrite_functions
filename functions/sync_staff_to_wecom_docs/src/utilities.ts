/**
 * check if the object is null or undefined or empty object
 * @param obj the object to check
 * @returns true if the object is null or undefined or empty object, otherwise false
 */
export function is_null_or_undefined_or_empty_object(obj: any) {
  return obj === null || obj === undefined || Object.keys(obj).length === 0;
}

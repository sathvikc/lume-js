/**
 * Resolve a nested path in an object.
 * Example: path "user.name" returns obj.user.name
 *
 * @param {object} obj - The root object
 * @param {string[]} pathArr - Array of keys
 * @returns {object} Last object in the path
 */
export function resolvePath(obj, pathArr) {
  return pathArr.reduce((acc, key) => {
    if (!acc) throw new Error(`Invalid path: ${pathArr.join(".")}`);
    return acc[key];
  }, obj);
}

/**
 * Utility functions for Lume.js
 */

/**
 * Resolve a nested path in an object.
 * Example: resolvePath(obj, ['user', 'address']) returns obj.user.address
 *
 * @param {object} obj - The root object
 * @param {string[]} pathArr - Array of keys
 * @returns {object} Last object in the path
 * @throws {Error} If path is invalid or doesn't exist
 */
export function resolvePath(obj, pathArr) {
  // If no path, return the object itself
  if (!pathArr || pathArr.length === 0) {
    return obj;
  }

  let current = obj;
  
  for (let i = 0; i < pathArr.length; i++) {
    const key = pathArr[i];
    
    if (current === null || current === undefined) {
      throw new Error(
        `Cannot access property "${key}" of ${current} at path: ${pathArr.slice(0, i + 1).join('.')}`
      );
    }
    
    if (!(key in current)) {
      throw new Error(
        `Property "${key}" does not exist at path: ${pathArr.slice(0, i + 1).join('.')}`
      );
    }
    
    current = current[key];
  }
  
  return current;
}
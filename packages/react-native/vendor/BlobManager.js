/**
 * The current Rollup configuration targets a CommonJs output.
 * This translates import statements to require statements.
 * React native recently shifted to ESM exports.
 * https://github.com/facebook/react-native/pull/48761/files
 * This causes requiring this module to return an object
 * of the form:
 * ```javascript
 * {
 *  _esModule: true,
 *  default: BlobManager
 * }
 * ```
 * This wrapper provides a small shim to conditionally return the default export of the module.
 */
const BlobManager = require('react-native/Libraries/Blob/BlobManager');
const interop = (mod) => (mod && mod.__esModule ? mod.default : mod);

module.exports = interop(BlobManager);

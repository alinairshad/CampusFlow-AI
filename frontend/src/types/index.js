/**
 * Shared type definitions (JSDoc / PropTypes).
 * Populated as models are added across stages.
 *
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {"student"|"admin"} role
 * @property {string} university_id
 *
 * @typedef {Object} StudentProfile
 * @property {string} user_id
 * @property {string} name
 * @property {string} department
 * @property {string} semester
 * @property {string} batch
 *
 * @typedef {Object} Message
 * @property {"user"|"assistant"} role
 * @property {string} content
 * @property {"knowledge"|"problem"|"application"} [type]
 * @property {Array} [sources]
 */

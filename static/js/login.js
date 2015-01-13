/* This handles the following:
 *   + Parsing of the query string for a roomName (if it exists)
 *   + Checking localStorage to determine the following information:
 *     - Is a userName key set with a valid value? If so, autopopulate the username field with this
 *       value.
 *     - Is a capabilities key set with valid values? If so, alter the navBar buttons to reflect the
 *       capabilities values. Valid capabilities:
 *        = cameraIsEnabled : bool
 *        = micIsEnabled    : bool
 *        = dashModeEnabled : bool
 *     - Example:
 *       {
 *         "userName" : <string>,
 *         "capabilities" : {
 *           "cameraIsEnabled" : <bool>,
 *           "micIsEnabled"    : <bool>,
 *           "dashModeEnabled" : <bool>
 *         }
 *       }
 *   + Bind the Join button with a handler that performs the following actions:
 *     - Verifies that userName and roomName are valid values, if not, use visual indication 
 *       and focus to direct user to problematic field
 *     - Maybe this class should take a "completed" callback which will be passed arguments for
 *       the userName, roomName, and capabilities for the next step.
 *     - Populate #roomName in index.html with the roomName
 */



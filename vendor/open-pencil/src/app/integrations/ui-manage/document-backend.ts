/**
 * Single document persistence facade for ui-manage: Nitro `/api/designs*`.
 * List CRUD lives in designs-api; editor open/save in bridge.
 */
export {
  useUiManageDesigns,
  type Design
} from './designs-api'

export {
  bootUiManageBridge,
  bootUiManageBridgeFromRoute,
  saveActiveToUiManage,
  parseUiManageBridge,
  configFromDesignRoute,
  type UiManageBridgeConfig
} from './bridge'

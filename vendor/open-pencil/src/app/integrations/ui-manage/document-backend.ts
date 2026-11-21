/**
 * Single document persistence facade for ui-manage.
 * List CRUD lives in designs-api (tRPC); editor open/save in bridge.
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

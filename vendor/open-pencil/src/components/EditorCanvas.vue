<script setup lang="ts">
import {
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
  PopoverContent,
  PopoverPortal,
  PopoverRoot
} from 'reka-ui'
import { computed, onUnmounted, ref, shallowRef, watch, type Component } from 'vue'
import IconLucideAlignHorizontalSpaceBetween from '~icons/lucide/align-horizontal-space-between'
import IconLucideAlignVerticalSpaceBetween from '~icons/lucide/align-vertical-space-between'
import IconLucidePanelBottom from '~icons/lucide/panel-bottom'
import IconLucidePanelLeft from '~icons/lucide/panel-left'
import IconLucidePanelRight from '~icons/lucide/panel-right'
import IconLucidePanelTop from '~icons/lucide/panel-top'

import { resolveEditorProfile } from '@open-pencil/core'
import type { PlacedStatusLabel } from '@open-pencil/core/canvas'
import {
  AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X,
  AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y,
  COMPONENT_LABEL_ICON_GAP,
  COMPONENT_LABEL_ICON_SIZE,
  SECTION_TITLE_GAP,
  SECTION_TITLE_HEIGHT
} from '@open-pencil/core/constants'
import type { ViewportTransform } from '@open-pencil/core/geometry'
import { PlayIslands, useCanvasInput } from '@open-pencil/vue/canvas'
import { useCanvasDrop } from '@open-pencil/vue/canvas/drop'
import { useEyedropperLoupe } from '@open-pencil/vue/canvas/eyedropper'
import { useCanvasVirtualReference } from '@open-pencil/vue/canvas/overlays'
import { useCanvasStatusLabels } from '@open-pencil/vue/canvas/statuses'
import { useCanvas } from '@open-pencil/vue/canvas/surface'
import { useTextEdit } from '@open-pencil/vue/canvas/text-edit'
import { toolCursor } from '@open-pencil/vue/editor/tool-cursor'
import { autoLayoutValueAnchor, type AutoLayoutValueField } from '@open-pencil/vue/shared/input'

import { useEditorStore } from '@/app/editor/active-store'
import {
  ensureCreationPage,
  toolNeedsPage
} from '@/app/integrations/ui-manage/blank-document'
import { isUiManageEmbed } from '@/app/integrations/ui-manage/mode'
import { useCanvasCollaborationAwareness } from '@/app/editor/canvas/collaboration-awareness'
import { createCanvasContextSelection } from '@/app/editor/canvas/context-selection'
import { canvasOverlayObstacles } from '@/app/editor/canvas/obstacles'
import { isUiManageSharePreview } from '@/app/integrations/ui-manage/mode'
import { appRuntimeConfig } from '@/app/runtime/config'
import { appPreferences } from '@/app/settings/preferences/store'
import CanvasEyedropperLoupe from '@/components/canvas/CanvasEyedropperLoupe.vue'
import CommentsLayer from '@/components/comments/CommentsLayer.vue'
import PreparationOverlay from '@/components/preparation/canvas/PreparationOverlay.vue'
import StatusLabelMenu from '@/components/statuses/StatusLabelMenu.vue'
import AppDropOverlay from '@/components/ui/feedback/AppDropOverlay.vue'
import { motionStyles } from '@/theme/motion/styles'
import { floatingSurface } from '@/theme/overlay'

import CanvasMenu from './canvas/CanvasMenu.vue'
import CanvasLabelEditor from './canvas/labels/CanvasLabelEditor.vue'
import { canvasLabelPresentation } from './canvas/labels/presentation'
import NumberField from './inputs/NumberField.vue'

const { paneId } = defineProps<{
  paneId?: string
}>()

const store = useEditorStore()
const sceneCanvasRef = ref<HTMLCanvasElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const isActivePane = computed(() => !paneId || store.activePaneId.value === paneId)

function activatePane() {
  if (paneId) store.setActivePane(paneId)
}

function beginCreate(event: PointerEvent) {
  activatePane()
  if (isUiManageEmbed && event.button === 0 && toolNeedsPage(store.state.activeTool)) {
    ensureCreationPage(store)
  }
}

function prepareDrop() {
  activatePane()
  if (isUiManageEmbed) ensureCreationPage(store)
}

function updatePaneCursor(cx: number, cy: number) {
  if (isActivePane.value) updateCursor(cx, cy)
}

const getRenderState = paneId ? () => store.getPaneRenderState(paneId) : undefined
/** This pane's view: its pan, zoom, page, and whether it previews. */
const paneView = computed(() => (paneId ? store.getPaneRenderState(paneId) : store.state))
const paneProfile = computed(() => resolveEditorProfile(paneView.value))
const onViewportResize = (width: number, height: number) => {
  if (paneId) store.resizePane(paneId, width, height)
  if (isActivePane.value) store.setViewportSize(width, height)
}

const { updateCursor } = useCanvasCollaborationAwareness(store)
const { selectAtContextPoint } = createCanvasContextSelection(canvasRef, store)

/** 分享预览翻页时保留当前帧，避免整页 Preparation 遮罩闪白。 */
const quietSharePageSwitch = () =>
  isUiManageSharePreview() && store.state.preparation?.kind === 'page-switch'

const shouldSuspendRender = () =>
  !quietSharePageSwitch() &&
  store.state.preparation !== null &&
  store.state.preparation.kind !== 'font-retry' &&
  store.state.preparation.phase !== 'preparing-render'

const showPreparationOverlay = computed(
  () =>
    Boolean(store.state.preparation) &&
    store.state.preparation?.kind !== 'font-retry' &&
    !quietSharePageSwitch()
)

/** The pan and zoom of the scene's last drawn frame, which preview islands follow. */
const drawnView = shallowRef<ViewportTransform | null>(null)
/** Where popovers on the canvas are placed: the drawn frame, or the live view before one is drawn. */
const overlayView = computed(() => drawnView.value ?? paneView.value)

// The tab's scene is presented only here once the canvas can draw, so waiting for it times out
// only while it is shown and drawing, not while the renderer and its fonts download.
let detachCanvas: (() => void) | null = null
onUnmounted(() => detachCanvas?.())
function canvasReady() {
  store.markCanvasReady()
  detachCanvas ??= store.preparationController.attachCanvas()
}

useCanvas(sceneCanvasRef, store, {
  layer: 'scene',
  onFrame: (view) => {
    drawnView.value = view
  },
  onReady: canvasReady,
  onFailed: (error) =>
    store.preparationController.failCanvas(
      new Error('The canvas could not start', { cause: error })
    ),
  shouldSuspendRender,
  showRulers: false,
  getRenderState,
  onViewportResize,
  onPresentation: (colorSpace) => {
    store.state.canvasPresentation = colorSpace
  }
})
const {
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
  hitTestStatusLabel
} = useCanvas(canvasRef, store, {
  layer: 'overlays',
  // The scene canvas reports a canvas that cannot start.
  onFailed: () => undefined,
  get showRulers() {
    // 分享预览是 play（editChrome=false），但仍展示设计稿刻度线。
    const sharePreview = isUiManageSharePreview()
    return (
      appRuntimeConfig.showRulers &&
      store.state.showRulers &&
      paneProfile.value.rulers &&
      (paneProfile.value.editChrome || sharePreview)
    )
  },
  getOverlayObstacles: () => canvasOverlayObstacles(canvasRef.value),
  shouldSuspendRender,
  getRenderState,
  onViewportResize
})
const {
  drag,
  cursorOverride,
  canvasLabelEdit,
  startCanvasLabelEdit,
  updateCanvasLabelEdit,
  commitCanvasLabelEdit,
  cancelCanvasLabelEdit,
  autoLayoutValueEdit,
  updateAutoLayoutValueEdit,
  commitAutoLayoutValueEdit,
  cancelAutoLayoutValueEdit,
  cleanupInteractions
} = useCanvasInput(
  canvasRef,
  store,
  hitTestSectionTitle,
  hitTestComponentLabel,
  hitTestFrameTitle,
  updatePaneCursor,
  activatePane,
  () => isActivePane.value,
  () => appPreferences.value.navigation.zoomSpeed
)

watch(isActivePane, (active) => {
  if (!active) cleanupInteractions()
})
onUnmounted(cleanupInteractions)

const openStatusLabel = shallowRef<PlacedStatusLabel | null>(null)
const { cursor: statusLabelCursor } = useCanvasStatusLabels(canvasRef, store, {
  hitTest: hitTestStatusLabel,
  onActivate: (label) => {
    activatePane()
    openStatusLabel.value = label
  }
})

useTextEdit(canvasRef, store, { isEnabled: () => isActivePane.value })
const { isDraggingOver } = useCanvasDrop(canvasRef, store, prepareDrop)

const valueFieldIcons = {
  paddingTop: IconLucidePanelTop,
  paddingRight: IconLucidePanelRight,
  paddingBottom: IconLucidePanelBottom,
  paddingLeft: IconLucidePanelLeft
} satisfies Record<Exclude<AutoLayoutValueField, 'itemSpacing'>, Component>

const canvasLabelEditNode = computed(() => {
  const edit = canvasLabelEdit.value
  return edit ? store.graph.getNode(edit.nodeId) : null
})
const canvasLabelEditAnchor = computed(() => {
  const node = canvasLabelEditNode.value
  if (!node) return null
  const origin = store.graph.getAbsolutePosition(node.id)
  // The view the reference projects through, so screen-sized offsets match the drawn frame.
  const { zoom, panX, panY } = overlayView.value
  const kind = canvasLabelEdit.value?.kind
  // The canvas starts an upright label on a whole screen pixel; the field starts on the same one.
  const abs = {
    x: (Math.round(origin.x * zoom + panX) - panX) / zoom,
    y: (Math.round(origin.y * zoom + panY) - panY) / zoom
  }
  // A component's name starts after its diamond, which keeps its screen size at any zoom.
  if (kind === 'component-label')
    return { x: abs.x + (COMPONENT_LABEL_ICON_SIZE + COMPONENT_LABEL_ICON_GAP) / zoom, y: abs.y }
  // A section inside another draws its title inside its top-left corner instead of above it.
  const nested = node.parentId && store.graph.closest(node.parentId, (n) => n.type === 'SECTION')
  if (kind === 'section-title' && nested) {
    const inset = SECTION_TITLE_GAP / zoom
    return {
      x: abs.x + inset,
      y: abs.y + inset + (SECTION_TITLE_HEIGHT + SECTION_TITLE_GAP) / zoom
    }
  }
  return { x: abs.x, y: abs.y }
})
const canvasLabelEditReference = useCanvasVirtualReference(
  canvasRef,
  overlayView,
  canvasLabelEditAnchor
)
const canvasLabelEditPresentation = computed(() =>
  canvasLabelPresentation(store, canvasLabelEditNode.value ?? null, canvasLabelEdit.value?.kind)
)

const valueEditorAnchor = computed(() => {
  const edit = autoLayoutValueEdit.value
  return edit ? autoLayoutValueAnchor(store, edit.nodeId, edit.field, edit.gap) : null
})
const valueEditorReference = useCanvasVirtualReference(canvasRef, overlayView, valueEditorAnchor)
const valueEditorIcon = computed(() => {
  const edit = autoLayoutValueEdit.value
  if (!edit) return IconLucidePanelTop
  if (edit.field !== 'itemSpacing') return valueFieldIcons[edit.field]
  return store.graph.getNode(edit.nodeId)?.layoutMode === 'VERTICAL'
    ? IconLucideAlignVerticalSpaceBetween
    : IconLucideAlignHorizontalSpaceBetween
})

const eyedropperLoupe = useEyedropperLoupe(store, canvasRef, () => isActivePane.value)

// The eyedropper's loupe stands in for the cursor while it shows.
const cursor = computed(() =>
  eyedropperLoupe.visible.value
    ? 'none'
    : toolCursor(
        store.state.activeTool,
        statusLabelCursor.value ?? cursorOverride.value
      )
)
</script>

<template>
  <ContextMenuRoot :modal="false">
    <ContextMenuTrigger as-child @contextmenu.capture="selectAtContextPoint">
      <div
        ref="area"
        data-test-id="canvas-area"
        :data-pane-id="paneId"
        :data-active-pane="isActivePane ? 'true' : 'false'"
        class="canvas-area relative min-h-0 min-w-0 flex-1 overflow-hidden"
        @pointerdown.capture="beginCreate"
        @focusin.capture="activatePane"
        @wheel.capture="activatePane"
        @dragenter.capture="activatePane"
      >
        <canvas
          ref="sceneCanvasRef"
          :data-pane-id="paneId"
          data-test-id="scene-canvas-element"
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 size-full outline-none"
        />
        <canvas
          ref="canvasRef"
          :data-pane-id="paneId"
          data-test-id="canvas-element"
          tabindex="-1"
          :style="{ cursor }"
          class="absolute inset-0 block size-full touch-none outline-none"
        />
        <PlayIslands :view="paneView" :drawn="drawnView" :canvas="canvasRef" />
        <AppDropOverlay :visible="isDraggingOver" />
        <CanvasEyedropperLoupe :loupe="eyedropperLoupe" />
        <StatusLabelMenu
          :label="openStatusLabel"
          :canvas="canvasRef"
          @close="openStatusLabel = null"
        />
        <CanvasLabelEditor
          :edit="canvasLabelEdit"
          :presentation="canvasLabelEditPresentation"
          :reference="canvasLabelEditReference"
          @update="updateCanvasLabelEdit"
          @commit="commitCanvasLabelEdit"
          @cancel="cancelCanvasLabelEdit"
        />
        <PopoverRoot :open="!!autoLayoutValueEdit">
          <PopoverPortal>
            <PopoverContent
              v-if="autoLayoutValueEdit && valueEditorReference"
              :reference="valueEditorReference"
              side="top"
              align="center"
              :side-offset="AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y"
              :align-offset="AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X"
              :collision-padding="8"
              :class="['z-50 w-20 p-1', floatingSurface, motionStyles.floating]"
              data-test-id="auto-layout-value-editor"
              @keydown.escape.prevent="cancelAutoLayoutValueEdit"
              @open-auto-focus.prevent
            >
              <NumberField
                :model-value="autoLayoutValueEdit.value"
                :min="0"
                :step="1"
                data-test-id="auto-layout-value-input"
                @update:model-value="updateAutoLayoutValueEdit"
                @commit="(value: number) => commitAutoLayoutValueEdit(value)"
                @editing-change="
                  (editing: boolean) =>
                    !editing &&
                    autoLayoutValueEdit &&
                    commitAutoLayoutValueEdit(autoLayoutValueEdit.value)
                "
              >
                <template #icon>
                  <component :is="valueEditorIcon" class="size-3.5" />
                </template>
              </NumberField>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
        <CommentsLayer v-if="isActivePane" :canvas-el="canvasRef" :drawn="drawnView" />
        <PreparationOverlay
          v-if="showPreparationOverlay && store.state.preparation"
          :preparation="store.state.preparation"
        />
      </div>
    </ContextMenuTrigger>

    <ContextMenuPortal>
      <CanvasMenu />
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>

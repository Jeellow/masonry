<template>
  <div
    ref="masonryContainer"
    class="masonry-container"
    :class="{ 'is-visible': hasItems }"
    :style="{
      '--num-columns': numColumns,
      '--gap': `${gap}px`
    }"
    v-show="hasItems"
  >
    <div
      v-for="(item, index) in processedItems"
      :key="getItemKey(item, index)"
      class="masonry-item"
      :class="{ 'lazy-load': enableLazyLoading }"
    >
      <wwLayoutItemContext
        :index="index"
        :item="item"
        is-repeat
        :data="item"
      >
        <wwLayout path="itemContent" class="masonry-item-content" />
      </wwLayoutItemContext>
    </div>
  </div>
</template>

<script>
import { computed, watch, shallowRef, ref, onMounted, onBeforeUnmount } from 'vue'

export default {
  props: {
    uid: { type: String, required: true },
    content: { type: Object, required: true },
    /* wwEditor:start */
    wwEditorState: { type: Object, required: true },
    /* wwEditor:end */
  },
  emits: ['trigger-event', 'update:content'],
  setup(props) {
    /* wwEditor:start */
    const isEditing = computed(() => props.wwEditorState?.isEditing)
    /* wwEditor:end */

    // Internal variable for item count
    const { setValue: setItemCount } = wwLib.wwVariable.useComponentVariable({
      uid: props.uid,
      name: 'itemCount',
      type: 'number',
      defaultValue: 0,
    })

    // Refs
    const masonryContainer = ref(null)
    const processedItems = shallowRef([])
    const containerWidth = ref(0)

    let resizeObserver = null

    // Configuration
    const minColumns = computed(() => props.content?.minColumns || 1)
    const maxColumns = computed(() => props.content?.maxColumns || 3)
    const baseColumnWidth = computed(() => props.content?.columnWidth || 300)
    const gap = computed(() => props.content?.gap ?? 16)
    const hasItems = computed(() => processedItems.value?.length > 0)
    const enableLazyLoading = computed(() => props.content?.enableLazyLoading !== false)

    // Calculate number of columns
    const numColumns = computed(() => {
      if (!containerWidth.value) return minColumns.value

      const availableWidth = containerWidth.value
      const gapValue = gap.value

      // Calculate how many columns would fit
      let columns = Math.floor((availableWidth + gapValue) / (baseColumnWidth.value + gapValue))

      // Clamp between min and max
      return Math.max(minColumns.value, Math.min(maxColumns.value, columns))
    })

    // Memoized key function
    const getItemKey = (item, index) => {
      if (item?.id !== undefined && item.id !== null) return `item-${item.id}`
      if (item?.uuid) return `item-${item.uuid}`
      if (item?._id) return `item-${item._id}`
      return `item-idx-${index}`
    }

    // Watch items changes
    watch(
      () => props.content?.items,
      (newItems) => {
        if (!Array.isArray(newItems)) {
          processedItems.value = []
          setItemCount(0)
          return
        }
        processedItems.value = [...newItems]
        setItemCount(newItems.length)
      },
      { immediate: true }
    )

    // Observe container width changes
    const observeContainerWidth = () => {
      if (!masonryContainer.value) return

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerWidth.value = entry.contentRect.width
        }
      })

      resizeObserver.observe(masonryContainer.value)
    }

    // Lifecycle
    onMounted(() => {
      if (masonryContainer.value) {
        containerWidth.value = masonryContainer.value.offsetWidth
        observeContainerWidth()
      }
    })

    onBeforeUnmount(() => {
      if (resizeObserver) resizeObserver.disconnect()
    })

    return {
      masonryContainer,
      processedItems,
      hasItems,
      enableLazyLoading,
      getItemKey,
      numColumns,
      gap,
      /* wwEditor:start */
      isEditing,
      /* wwEditor:end */
    }
  },
}
</script>

<style lang="scss" scoped>
.masonry-container {
  width: 100%;
  min-height: 100px;
  box-sizing: border-box;
  opacity: 0;
  transition: opacity 0.25s ease-in-out;

  // CSS Columns for masonry layout
  column-count: var(--num-columns, 3);
  column-gap: var(--gap, 16px);

  &.is-visible {
    opacity: 1;
  }
}

.masonry-item {
  box-sizing: border-box;
  backface-visibility: hidden;
  transform: translateZ(0);
  animation: fadeInMasonry 0.3s ease-out;

  // Prevent items from breaking across columns
  break-inside: avoid;
  display: inline-block;
  width: 100%;
  margin-bottom: var(--gap, 16px);
}

.masonry-item-content {
  width: 100%;
  height: 100%;
  contain: layout style;

  // Image lazy loading optimization
  :deep(img) {
    content-visibility: auto;
    loading: lazy;
    decoding: async;
  }

  // Placeholder while loading
  :deep(img[loading="lazy"]:not([src])) {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
}

/* Smooth fade-in for new items */
@keyframes fadeInMasonry {
  from {
    opacity: 0;
    transform: translateY(10px) translateZ(0);
  }
  to {
    opacity: 1;
    transform: translateY(0) translateZ(0);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Optimize rendering during visibility changes */
.masonry-container:not(.is-visible) {
  pointer-events: none;
  content-visibility: hidden;
}

/* Performance optimization for layout context */
.masonry-item-content {
  :deep(.ww-layout) {
    contain: layout style;
  }

  :deep(.ww-layout-item) {
    contain: layout style paint;
  }
}

/* Lazy loading optimization */
.masonry-item.lazy-load {
  content-visibility: auto;
  contain-intrinsic-size: auto 300px;
}

.masonry-item.lazy-load .masonry-item-content {
  :deep(img),
  :deep(video),
  :deep(iframe) {
    loading: lazy;
    decoding: async;
  }

  :deep(video) {
    preload: metadata;
  }
}
</style>

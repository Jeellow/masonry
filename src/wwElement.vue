<template>
  <div
    class="masonry-container"
    :class="{
      'is-visible': hasItems,
      'no-animations': disableAnimations,
      'is-loading': isProgressiveLoading
    }"
  >
    <MasonryWall
      v-show="hasItems"
      :key="masonryKey"
      :items="visibleItems"
      :column-width="columnWidth"
      :gap="gap"
      :min-columns="minColumns"
      :max-columns="maxColumns"
      :ssr-columns="1"
    >
      <template #default="{ item, index }">
        <MasonryItem
          :item="item"
          :index="index"
          :item-key="getItemKey(item, index)"
          :repeated-items="processedItems"
          :enable-lazy-loading="enableLazyLoading"
          :is-skeleton="item.__skeleton"
        />
      </template>
    </MasonryWall>
  </div>
</template>

<script>
import { computed, watch, shallowRef, ref, nextTick, defineComponent } from 'vue'
import MasonryWall from '@yeger/vue-masonry-wall'

// Optimized child component for better memoization
const MasonryItem = defineComponent({
  name: 'MasonryItem',
  props: {
    item: { type: Object, required: true },
    index: { type: Number, required: true },
    itemKey: { type: String, required: true },
    repeatedItems: { type: Array, required: true },
    enableLazyLoading: { type: Boolean, default: true },
    isSkeleton: { type: Boolean, default: false },
  },
  template: `
    <div
      class="masonry-item"
      :key="itemKey"
      :data-index="index"
      :class="{
        'lazy-load': enableLazyLoading,
        'is-skeleton': isSkeleton
      }"
    >
      <div v-if="isSkeleton" class="skeleton-loader" :style="{ height: item.__skeletonHeight + 'px' }">
        <div class="skeleton-image" :style="{ height: (item.__skeletonHeight * 0.7) + 'px' }"></div>
        <div class="skeleton-text"></div>
        <div class="skeleton-text short"></div>
      </div>
      <wwLayoutItemContext
        v-else
        :key="'context-' + itemKey"
        :index="index"
        :item="null"
        is-repeat
        :data="item"
        :repeated-items="repeatedItems"
      >
        <wwLayout path="itemContent" class="masonry-item-content" />
      </wwLayoutItemContext>
    </div>
  `,
})

export default {
  components: {
    MasonryWall,
    MasonryItem,
  },
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

    // Use shallowRef for better performance with large arrays
    const processedItems = shallowRef([])

    // Progressive rendering: items actually displayed
    const visibleItems = shallowRef([])
    const isProgressiveLoading = ref(false)

    // Performance optimization: disable animations during visibility changes
    const disableAnimations = ref(false)
    const masonryKey = ref(0)

    // Track visibility state
    const wasVisible = ref(false)
    let animationTimeout = null
    let recalcTimeout = null
    let progressiveTimeout = null

    // Watch items and update shallowRef
    watch(
      () => props.content?.items,
      (newItems) => {
        if (!Array.isArray(newItems)) {
          processedItems.value = []
          setItemCount(0)
          return
        }
        // Create new array reference for optimal reactivity
        processedItems.value = [...newItems]
        setItemCount(newItems.length)
      },
      { immediate: true }
    )

    // Column width and gap with memoization
    const columnWidth = computed(() => props.content?.columnWidth || 300)
    const gap = computed(() => props.content?.gap ?? 16)

    // Column constraints for performance
    const minColumns = computed(() => props.content?.minColumns || 1)
    const maxColumns = computed(() => props.content?.maxColumns || 10)

    // Has items flag for visibility
    const hasItems = computed(() => processedItems.value?.length > 0)

    // Lazy loading configuration
    const enableLazyLoading = computed(() => props.content?.enableLazyLoading !== false)

    // Memoized key function for stable item keys
    const getItemKey = (item, index) => {
      // Try multiple strategies for stable keys
      if (item?.id !== undefined && item.id !== null) return `item-${item.id}`
      if (item?.uuid) return `item-${item.uuid}`
      if (item?._id) return `item-${item._id}`
      // Fallback to index (less optimal but necessary)
      return `item-idx-${index}`
    }

    // Generate realistic skeleton placeholders with variable heights
    const generateSkeletons = (count) => {
      const heights = [200, 250, 180, 300, 220, 270, 190, 240, 280, 210, 260, 230, 290, 200, 250]
      return Array(count).fill(null).map((_, i) => ({
        __skeleton: true,
        __skeletonId: `skeleton-${i}`,
        __skeletonHeight: heights[i % heights.length]
      }))
    }

    // Optimized progressive rendering: show skeletons immediately, then replace progressively
    const renderItemsProgressively = (items, batchSize = 3, delayBetweenBatches = 80) => {
      return new Promise((resolve) => {
        if (!items || items.length === 0) {
          visibleItems.value = []
          isProgressiveLoading.value = false
          resolve()
          return
        }

        isProgressiveLoading.value = true

        // Show skeletons IMMEDIATELY for instant feedback
        const skeletons = generateSkeletons(items.length)
        visibleItems.value = skeletons

        // Wait 500ms for WeWeb to process, then start replacing skeletons
        progressiveTimeout = setTimeout(() => {
          let currentIndex = 0

          const renderBatch = () => {
            const endIndex = Math.min(currentIndex + batchSize, items.length)

            // Replace skeletons progressively (keep existing items + add new ones)
            const updatedItems = [
              ...items.slice(0, endIndex),
              ...skeletons.slice(endIndex)
            ]

            visibleItems.value = updatedItems
            currentIndex = endIndex

            if (currentIndex < items.length) {
              progressiveTimeout = setTimeout(renderBatch, delayBetweenBatches)
            } else {
              // All items rendered
              isProgressiveLoading.value = false
              resolve()
            }
          }

          renderBatch()
        }, 500) // Give WeWeb 500ms to process display change
      })
    }

    // Solution 1 & 4: Optimize visibility changes with skeletons and progressive rendering
    watch(hasItems, (isVisible, oldValue) => {
      // Clear any pending timeouts
      if (animationTimeout) clearTimeout(animationTimeout)
      if (recalcTimeout) clearTimeout(recalcTimeout)
      if (progressiveTimeout) clearTimeout(progressiveTimeout)

      // Detect visibility change (none -> block or block -> none)
      const visibilityChanged = wasVisible.value !== isVisible

      if (visibilityChanged && isVisible) {
        // Becoming visible: disable animations immediately
        disableAnimations.value = true

        // Start rendering process immediately (skeletons will show right away)
        requestAnimationFrame(() => {
          nextTick(async () => {
            // Progressive rendering with skeletons (instant feedback)
            await renderItemsProgressively(processedItems.value, 3, 80)

            // Re-enable animations after everything is rendered
            animationTimeout = setTimeout(() => {
              disableAnimations.value = false
            }, 200)
          })
        })
      } else if (visibilityChanged && !isVisible) {
        // Becoming hidden: disable animations immediately
        disableAnimations.value = true
        isProgressiveLoading.value = false

        // Reset after transition
        recalcTimeout = setTimeout(() => {
          disableAnimations.value = false
          visibleItems.value = []
        }, 100)
      }

      wasVisible.value = isVisible
    })

    // Watch processedItems changes (new data loaded)
    watch(
      () => processedItems.value.length,
      (newLength, oldLength) => {
        // If items changed while visible, update with progressive rendering
        if (hasItems.value && newLength > 0 && wasVisible.value) {
          if (progressiveTimeout) clearTimeout(progressiveTimeout)
          renderItemsProgressively(processedItems.value, 3, 80)
        } else if (!hasItems.value) {
          visibleItems.value = []
        }
      }
    )

    return {
      processedItems,
      visibleItems,
      isProgressiveLoading,
      columnWidth,
      gap,
      minColumns,
      maxColumns,
      hasItems,
      enableLazyLoading,
      getItemKey,
      disableAnimations,
      masonryKey,
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
  contain: layout style paint;
  opacity: 0;
  transition: opacity 0.25s ease-in-out;

  &.is-visible {
    opacity: 1;
  }

  // Solution 1: Disable animations during visibility changes
  &.no-animations {
    .masonry-item {
      transition: none !important;
      animation: none !important;
    }
  }
}

.masonry-item {
  width: 100%;
  will-change: transform;
  contain: layout style paint;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out;
  backface-visibility: hidden;
  transform: translateZ(0);

  // Force GPU compositing for better performance
  -webkit-transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  -webkit-perspective: 1000;
}

.masonry-item-content {
  width: 100%;
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

.masonry-item {
  animation: fadeInMasonry 0.3s ease-out;
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

/* Skeleton loader styles with variable heights */
.masonry-item.is-skeleton {
  .skeleton-loader {
    padding: 12px;
    animation: none;
    box-sizing: border-box;
  }

  .skeleton-image {
    width: 100%;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  .skeleton-text {
    width: 100%;
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 8px;

    &.short {
      width: 60%;
    }
  }
}

.masonry-container.is-loading {
  pointer-events: none;
}

/* Smooth fade transition when replacing skeletons */
.masonry-item {
  &.is-skeleton {
    opacity: 0.7;
  }

  &:not(.is-skeleton) {
    animation: fadeInItem 0.3s ease-out;
  }
}

@keyframes fadeInItem {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

<template>
  <div
    ref="masonryContainer"
    class="masonry-container"
    :class="{
      'is-visible': hasItems,
      'no-animations': disableAnimations
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
        :item="null"
        is-repeat
        :data="item"
        :repeated-items="processedItems"
      >
        <wwLayout path="itemContent" class="masonry-item-content" />
      </wwLayoutItemContext>
    </div>
  </div>
</template>

<script>
import { computed, watch, shallowRef, ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Masonry from 'masonry-layout'

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
    const disableAnimations = ref(false)
    const wasVisible = ref(false)

    // Masonry instance
    let masonryInstance = null
    let layoutTimeout = null
    let animationTimeout = null

    // Configuration
    const columnWidth = computed(() => props.content?.columnWidth || 300)
    const gap = computed(() => props.content?.gap ?? 16)
    const hasItems = computed(() => processedItems.value?.length > 0)
    const enableLazyLoading = computed(() => props.content?.enableLazyLoading !== false)

    // Memoized key function
    const getItemKey = (item, index) => {
      if (item?.id !== undefined && item.id !== null) return `item-${item.id}`
      if (item?.uuid) return `item-${item.uuid}`
      if (item?._id) return `item-${item._id}`
      return `item-idx-${index}`
    }

    // Initialize Masonry
    const initMasonry = () => {
      if (!masonryContainer.value) return

      masonryInstance = new Masonry(masonryContainer.value, {
        itemSelector: '.masonry-item',
        columnWidth: columnWidth.value,
        gutter: gap.value,
        fitWidth: false,
        transitionDuration: 0, // Disable masonry animations, we handle them
      })
    }

    // Layout masonry
    const layoutMasonry = (delay = 0) => {
      if (layoutTimeout) clearTimeout(layoutTimeout)

      layoutTimeout = setTimeout(() => {
        if (masonryInstance) {
          masonryInstance.layout()
        }
      }, delay)
    }

    // Destroy masonry
    const destroyMasonry = () => {
      if (masonryInstance) {
        masonryInstance.destroy()
        masonryInstance = null
      }
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

        // Relayout after items change
        if (hasItems.value && masonryInstance) {
          nextTick(() => layoutMasonry(50))
        }
      },
      { immediate: true }
    )

    // Watch visibility changes
    watch(hasItems, (isVisible) => {
      if (animationTimeout) clearTimeout(animationTimeout)
      const visibilityChanged = wasVisible.value !== isVisible

      if (visibilityChanged && isVisible) {
        disableAnimations.value = true

        nextTick(() => {
          if (!masonryInstance) {
            initMasonry()
          }

          // Layout with delay for WeWeb
          layoutMasonry(100)

          // Re-enable animations
          animationTimeout = setTimeout(() => {
            disableAnimations.value = false
          }, 200)
        })
      } else if (visibilityChanged && !isVisible) {
        disableAnimations.value = true
        destroyMasonry()
      }

      wasVisible.value = isVisible
    })

    // Watch config changes
    watch([columnWidth, gap], () => {
      if (masonryInstance && hasItems.value) {
        destroyMasonry()
        nextTick(() => {
          initMasonry()
          layoutMasonry(50)
        })
      }
    })

    // Lifecycle
    onMounted(() => {
      if (hasItems.value) {
        nextTick(() => {
          initMasonry()
          layoutMasonry(100)
        })
      }
    })

    onBeforeUnmount(() => {
      if (layoutTimeout) clearTimeout(layoutTimeout)
      if (animationTimeout) clearTimeout(animationTimeout)
      destroyMasonry()
    })

    return {
      masonryContainer,
      processedItems,
      hasItems,
      enableLazyLoading,
      getItemKey,
      disableAnimations,
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

  &.is-visible {
    opacity: 1;
  }

  // Disable animations during layout calculations
  &.no-animations {
    .masonry-item {
      transition: none !important;
    }
  }
}

.masonry-item {
  margin-bottom: 0; // Masonry handles spacing
  box-sizing: border-box;
  backface-visibility: hidden;
  transform: translateZ(0);
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
</style>

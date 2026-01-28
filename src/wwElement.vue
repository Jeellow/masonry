<template>
  <div class="masonry-container" :class="{ 'is-visible': hasItems }">
    <MasonryWall
      v-show="hasItems"
      :items="processedItems"
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
        />
      </template>
    </MasonryWall>
  </div>
</template>

<script>
import { computed, watch, shallowRef, defineComponent } from 'vue'
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
  },
  template: `
    <div
      class="masonry-item"
      :key="itemKey"
      :data-index="index"
      :class="{ 'lazy-load': enableLazyLoading }"
    >
      <wwLayoutItemContext
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

    return {
      processedItems,
      columnWidth,
      gap,
      minColumns,
      maxColumns,
      hasItems,
      enableLazyLoading,
      getItemKey,
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
</style>

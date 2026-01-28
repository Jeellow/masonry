<template>
  <div class="masonry-wrapper">
    <div
      class="masonry-container"
      :class="{ 'is-visible': hasItems }"
      :style="{ '--gap': `${gap}px` }"
      v-show="hasItems"
    >
      <div
        v-for="(column, colIndex) in columns"
        :key="`col-${colIndex}`"
        class="masonry-column"
      >
        <div
          v-for="{ item, originalIndex } in column"
          :key="getItemKey(item, originalIndex)"
          class="masonry-item"
          :class="{ 'lazy-load': enableLazyLoading }"
        >
          <wwLayoutItemContext
            :index="originalIndex"
            :item="item"
            is-repeat
            :data="item"
          >
            <wwLayout path="itemContent" class="masonry-item-content" />
          </wwLayoutItemContext>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, watch, shallowRef } from 'vue'

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
    const processedItems = shallowRef([])

    // Configuration
    const maxColumns = computed(() => props.content?.maxColumns || 3)
    const gap = computed(() => props.content?.gap ?? 16)
    const hasItems = computed(() => processedItems.value?.length > 0)
    const enableLazyLoading = computed(() => props.content?.enableLazyLoading !== false)

    // Distribute items into columns (round-robin)
    const columns = computed(() => {
      const cols = []
      const numCols = maxColumns.value

      console.log('=== MASONRY DEBUG ===')
      console.log('maxColumns:', numCols)
      console.log('processedItems.length:', processedItems.value.length)

      // Initialize columns
      for (let i = 0; i < numCols; i++) {
        cols.push([])
      }

      // Distribute items round-robin
      processedItems.value.forEach((item, index) => {
        const colIndex = index % numCols
        console.log(`Item ${index} -> Column ${colIndex}`)
        cols[colIndex].push({ item, originalIndex: index })
      })

      console.log('Columns created:', cols.length)
      console.log('Items per column:', cols.map(c => c.length))
      console.log('===================')

      return cols
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

    return {
      processedItems,
      hasItems,
      enableLazyLoading,
      getItemKey,
      columns,
      gap,
      /* wwEditor:start */
      isEditing,
      /* wwEditor:end */
    }
  },
}
</script>

<style lang="scss" scoped>
.masonry-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.masonry-container {
  width: 100%;
  min-height: 100px;
  box-sizing: border-box;
  opacity: 0;
  transition: opacity 0.25s ease-in-out;
  display: flex;
  flex-direction: row;
  gap: var(--gap, 16px);

  &.is-visible {
    opacity: 1;
  }
}

.masonry-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--gap, 16px);
  min-width: 0; /* Important pour flex shrink */
}

.masonry-item {
  box-sizing: border-box;
  backface-visibility: hidden;
  transform: translateZ(0);
  animation: fadeInMasonry 0.3s ease-out;
  width: 100%;
  max-width: 100%; /* Force items to respect column width */
  overflow: hidden; /* Prevent overflow */
}

.masonry-item-content {
  width: 100%;
  max-width: 100%; /* Force content to respect item width */
  height: 100%;
  contain: layout style;

  /* Force all children to respect width */
  :deep(> *) {
    max-width: 100%;
  }

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

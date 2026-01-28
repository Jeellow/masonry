<template>
  <div class="masonry-container" :style="containerStyle">
    <MasonryWall
      v-show="processedItems?.length"
      :items="processedItems"
      :column-width="columnWidth"
      :gap="gap"
      :ssr-columns="1"
    >
      <template #default="{ item, index }">
        <div class="masonry-item">
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
      </template>
    </MasonryWall>
  </div>
</template>

<script>
import { computed, watch } from 'vue'
import MasonryWall from '@yeger/vue-masonry-wall'

export default {
  components: {
    MasonryWall,
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

    // Process items
    const processedItems = computed(() => {
      const items = props.content?.items || []
      if (!Array.isArray(items)) return []
      return items
    })

    // Update item count when items change
    watch(processedItems, (newItems) => {
      setItemCount(newItems?.length || 0)
    }, { immediate: true })

    // Container styles
    const containerStyle = computed(() => ({
      width: '100%',
      height: '100%',
    }))

    // Column width and gap
    const columnWidth = computed(() => props.content?.columnWidth || 300)
    const gap = computed(() => props.content?.gap ?? 16)

    return {
      content: computed(() => props.content),
      processedItems,
      containerStyle,
      columnWidth,
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
}

.masonry-item {
  width: 100%;
}

.masonry-item-content {
  width: 100%;
}
</style>

export default {
  editor: {
    label: {
      en: 'Masonry Wall',
    },
    icon: 'view-grid',
  },
  properties: {
    // ============================================
    // ITEMS DATA
    // ============================================
    items: {
      label: { en: 'Items' },
      type: 'Array',
      section: 'settings',
      bindable: true,
      defaultValue: [
        { id: 'item1' },
        { id: 'item2' },
        { id: 'item3' },
      ],
      options: {
        expandable: true,
        getItemLabel(item, index) {
          return item?.id || item?.title || `Item ${index + 1}`
        },
        item: {
          type: 'Object',
          defaultValue: { id: '' },
          options: {
            item: {
              id: { label: { en: 'ID' }, type: 'Text' },
            },
          },
        },
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'array',
        tooltip: 'Array of objects to display in the masonry grid',
      },
      /* wwEditor:end */
    },

    // Item content dropzone (repeatable for each item)
    itemContent: {
      hidden: true,
      defaultValue: [],
      bindable: 'repeatable',
    },

    // ============================================
    // LAYOUT SETTINGS
    // ============================================
    columnWidth: {
      label: { en: 'Column Width' },
      type: 'Number',
      section: 'style',
      bindable: true,
      defaultValue: 300,
      options: {
        min: 50,
        max: 1000,
        step: 10,
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Minimum column width in pixels (50-1000)',
      },
      propertyHelp: {
        tooltip: 'Minimum width for each column. Columns will expand to fill available space.',
      },
      /* wwEditor:end */
    },
    gap: {
      label: { en: 'Gap' },
      type: 'Number',
      section: 'style',
      bindable: true,
      defaultValue: 16,
      options: {
        min: 0,
        max: 100,
        step: 1,
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Gap between items in pixels (0-100)',
      },
      propertyHelp: {
        tooltip: 'Space between masonry items in pixels.',
      },
      /* wwEditor:end */
    },
    minColumns: {
      label: { en: 'Min Columns' },
      type: 'Number',
      section: 'style',
      bindable: true,
      defaultValue: 1,
      options: {
        min: 1,
        max: 20,
        step: 1,
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Minimum number of columns (1-20)',
      },
      propertyHelp: {
        tooltip: 'Minimum number of columns for better performance control.',
      },
      /* wwEditor:end */
    },
    maxColumns: {
      label: { en: 'Max Columns' },
      type: 'Number',
      section: 'style',
      bindable: true,
      defaultValue: 10,
      options: {
        min: 1,
        max: 20,
        step: 1,
      },
      /* wwEditor:start */
      bindingValidation: {
        type: 'number',
        tooltip: 'Maximum number of columns (1-20)',
      },
      propertyHelp: {
        tooltip: 'Maximum number of columns for better performance control.',
      },
      /* wwEditor:end */
    },

    // ============================================
    // PERFORMANCE SETTINGS
    // ============================================
    enableLazyLoading: {
      label: { en: 'Enable Lazy Loading' },
      type: 'OnOff',
      section: 'settings',
      bindable: true,
      defaultValue: true,
      /* wwEditor:start */
      propertyHelp: {
        tooltip: 'Enable lazy loading for images to improve initial load performance.',
      },
      /* wwEditor:end */
    },
  },
}

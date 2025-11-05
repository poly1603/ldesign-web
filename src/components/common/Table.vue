<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          >
            {{ column.title }}
          </th>
          <th v-if="$slots.actions" scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            操作
          </th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-if="loading" class="text-center">
          <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-6 py-12">
            <Spinner text="加载中..." />
          </td>
        </tr>
        <tr v-else-if="data.length === 0" class="text-center">
          <td :colspan="columns.length + ($slots.actions ? 1 : 0)" class="px-6 py-12 text-gray-500">
            暂无数据
          </td>
        </tr>
        <tr
          v-else
          v-for="(row, index) in data"
          :key="index"
          class="hover:bg-gray-50 transition-colors"
        >
          <td
            v-for="column in columns"
            :key="column.key"
            class="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
          >
            <slot :name="`cell-${column.key}`" :row="row" :column="column" :index="index">
              {{ row[column.key] }}
            </slot>
          </td>
          <td v-if="$slots.actions" class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
            <slot name="actions" :row="row" :index="index"></slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import Spinner from './Spinner.vue'

interface Column {
  key: string
  title: string
}

interface Props {
  columns: Column[]
  data: any[]
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false,
})
</script>





















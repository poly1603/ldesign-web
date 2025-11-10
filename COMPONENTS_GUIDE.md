# 组件使用指南

## ConfirmDialog - 确认对话框组件

通用的确认对话框组件，支持多种类型和自定义样式。

### 基础用法

```vue
<template>
  <div>
    <button @click="showDialog = true">删除项目</button>
    
    <ConfirmDialog
      v-model="showDialog"
      type="danger"
      title="确认删除"
      message="确定要删除这个项目吗？"
      description="此操作不可撤销，项目的所有数据将被永久删除。"
      icon
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const showDialog = ref(false)

async function handleDelete() {
  // 执行删除操作
  await deleteProject()
}
</script>
```

### 使用 Composable（推荐）

更简洁的命令式调用方式：

```vue
<template>
  <div>
    <button @click="handleDeleteClick">删除项目</button>
    
    <!-- 全局确认对话框 -->
    <ConfirmDialog
      v-model="confirmState.show"
      v-bind="confirmState.options"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const { state: confirmState, confirmDelete, handleConfirm, handleCancel } = useConfirm()

async function handleDeleteClick() {
  const confirmed = await confirmDelete(
    '确定要删除这个项目吗？',
    '此操作不可撤销，项目的所有数据将被永久删除。'
  )
  
  if (confirmed) {
    // 执行删除
    await deleteProject()
  }
}
</script>
```

### Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `boolean` | - | 是否显示对话框（v-model） |
| `type` | `'info' \| 'warning' \| 'danger' \| 'success'` | `'info'` | 对话框类型 |
| `title` | `string` | - | 标题 |
| `message` | `string` | - | 消息内容（必填） |
| `description` | `string` | - | 描述信息 |
| `confirmText` | `string` | `'确认'` | 确认按钮文本 |
| `cancelText` | `string` | `'取消'` | 取消按钮文本 |
| `loadingText` | `string` | `'处理中...'` | 加载中文本 |
| `icon` | `boolean` | `false` | 是否显示图标 |
| `showClose` | `boolean` | `true` | 是否显示关闭按钮 |
| `closeOnOverlay` | `boolean` | `true` | 点击遮罩是否关闭 |

### Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| `update:modelValue` | `(value: boolean)` | 更新显示状态 |
| `confirm` | `()` | 点击确认按钮 |
| `cancel` | `()` | 点击取消按钮 |

### 类型说明

**danger** - 危险操作（删除等）
```vue
<ConfirmDialog
  type="danger"
  title="确认删除"
  message="确定要删除吗？"
  icon
/>
```

**warning** - 警告操作
```vue
<ConfirmDialog
  type="warning"
  title="警告"
  message="此操作可能影响系统"
  icon
/>
```

**info** - 信息提示
```vue
<ConfirmDialog
  type="info"
  title="提示"
  message="确定要继续吗？"
  icon
/>
```

**success** - 成功确认
```vue
<ConfirmDialog
  type="success"
  title="成功"
  message="操作完成"
  icon
/>
```

### 异步确认操作

支持异步操作，自动显示加载状态：

```vue
<template>
  <ConfirmDialog
    v-model="show"
    message="确定要提交吗？"
    @confirm="handleAsyncConfirm"
  />
</template>

<script setup lang="ts">
const show = ref(false)

async function handleAsyncConfirm() {
  // 自动显示加载状态
  await api.submitData()
  // 完成后自动关闭对话框
}
</script>
```

### useConfirm API

```typescript
const {
  state,           // 对话框状态
  confirm,         // 通用确认
  confirmDelete,   // 删除确认（预设样式）
  confirmWarning,  // 警告确认（预设样式）
  handleConfirm,   // 确认处理
  handleCancel,    // 取消处理
} = useConfirm()

// 使用示例
const result = await confirm({
  type: 'warning',
  title: '确认操作',
  message: '确定要执行此操作吗？',
  description: '这是一个详细的描述',
})

if (result) {
  // 用户点击了确认
}
```

---

## 完整使用示例

### 示例1：删除项目

```vue
<template>
  <div class="project-item">
    <h3>{{ project.name }}</h3>
    <button @click="handleDelete">删除</button>
    
    <ConfirmDialog
      v-model="confirmState.show"
      v-bind="confirmState.options"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useProjectsStore } from '@/stores/projects'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const props = defineProps<{
  project: Project
}>()

const projectsStore = useProjectsStore()
const { state: confirmState, confirmDelete, handleConfirm, handleCancel } = useConfirm()

async function handleDelete() {
  const confirmed = await confirmDelete(
    `确定要删除项目 "${props.project.name}" 吗？`,
    '删除后无法恢复，所有相关数据将被永久删除。'
  )
  
  if (confirmed) {
    await projectsStore.deleteProject(props.project.id)
  }
}
</script>
```

### 示例2：表单提交确认

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <!-- 表单内容 -->
    <button type="submit">提交</button>
    
    <ConfirmDialog
      v-model="showConfirm"
      type="warning"
      title="确认提交"
      message="确定要提交表单吗？"
      description="提交后将无法修改。"
      icon
      @confirm="submitForm"
    />
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const showConfirm = ref(false)

function handleSubmit() {
  showConfirm.value = true
}

async function submitForm() {
  // 提交表单
  await api.submit(formData)
  // 对话框会自动关闭
}
</script>
```

### 示例3：批量操作确认

```vue
<template>
  <div>
    <button @click="handleBatchDelete" :disabled="!selectedItems.length">
      删除选中项 ({{ selectedItems.length }})
    </button>
    
    <ConfirmDialog
      v-model="confirmState.show"
      v-bind="confirmState.options"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useConfirm } from '@/composables/useConfirm'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const selectedItems = ref<string[]>([])
const { state: confirmState, confirmDelete, handleConfirm, handleCancel } = useConfirm()

async function handleBatchDelete() {
  const count = selectedItems.value.length
  const confirmed = await confirmDelete(
    `确定要删除选中的 ${count} 个项目吗？`,
    '此操作将永久删除这些项目，无法恢复。'
  )
  
  if (confirmed) {
    await batchDelete(selectedItems.value)
    selectedItems.value = []
  }
}
</script>
```

---

## 其他组件

### LoadingSpinner

详见 [QUICK_START.md](./QUICK_START.md#1-loadingspinner-组件)

### ErrorMessage

详见 [QUICK_START.md](./QUICK_START.md#2-errormessage-组件)

### ProjectsStore

详见 [QUICK_START.md](./QUICK_START.md#3-projectsstore-使用)

---

## 最佳实践

### 1. 使用 Composable 简化代码

推荐使用 `useConfirm` 而不是直接使用组件：

```typescript
// ❌ 不推荐：需要管理多个状态
const showDeleteDialog = ref(false)
const showWarningDialog = ref(false)
const showInfoDialog = ref(false)

// ✅ 推荐：统一管理
const { confirmDelete, confirmWarning, confirm } = useConfirm()
```

### 2. 提供清晰的描述信息

```typescript
// ❌ 不够清晰
await confirmDelete('确定删除吗？')

// ✅ 提供详细信息
await confirmDelete(
  '确定要删除项目 "My Project" 吗？',
  '删除后无法恢复，所有相关数据将被永久删除。'
)
```

### 3. 根据操作类型选择合适的样式

```typescript
// 删除操作 - danger
await confirmDelete('确定要删除吗？')

// 警告操作 - warning
await confirmWarning('此操作可能影响其他用户')

// 普通确认 - info
await confirm({
  type: 'info',
  message: '确定要继续吗？'
})
```

### 4. 处理异步操作

```typescript
async function handleAction() {
  const confirmed = await confirmDelete('确定删除吗？')
  
  if (confirmed) {
    try {
      await deleteItem()
      // 成功提示
    } catch (error) {
      // 错误处理
    }
  }
}
```

---

**更新日期**: 2025-11-10

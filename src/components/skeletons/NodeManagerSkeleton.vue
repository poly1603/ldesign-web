<template>
  <div class="node-manager-skeleton">
    <!-- Summary Section -->
    <section class="section summary-section">
      <div class="section-header">
        <div class="skeleton skeleton-heading"></div>
      </div>
      <div class="summary-grid">
        <div v-for="i in 3" :key="i" class="summary-card">
          <div class="skeleton skeleton-icon"></div>
          <div class="summary-body">
            <div class="skeleton skeleton-text skeleton-text-sm"></div>
            <div class="skeleton skeleton-text skeleton-text-lg"></div>
            <div class="skeleton skeleton-text skeleton-text-xs"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Manager Section -->
    <section class="section manager-section">
      <div class="section-header">
        <div class="skeleton skeleton-heading"></div>
        <div class="skeleton skeleton-text skeleton-text-description"></div>
      </div>
      <div class="manager-grid">
        <div v-for="i in 4" :key="i" class="manager-card">
          <div class="manager-card-header">
            <div class="skeleton skeleton-text skeleton-text-md"></div>
            <div class="skeleton skeleton-tag"></div>
          </div>
          <div class="manager-meta">
            <div class="skeleton skeleton-text skeleton-text-sm"></div>
            <div class="skeleton skeleton-text skeleton-text-sm"></div>
            <div class="skeleton skeleton-text skeleton-text-sm"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Install Section -->
    <section class="section install-section">
      <div class="section-header">
        <div class="skeleton skeleton-heading"></div>
        <div class="skeleton skeleton-text skeleton-text-description"></div>
      </div>
      <div class="install-form">
        <div class="skeleton skeleton-text skeleton-text-sm" style="width: 120px;"></div>
        <div class="form-row">
          <div class="skeleton skeleton-input"></div>
          <div class="skeleton skeleton-button"></div>
        </div>
        <div class="skeleton skeleton-text skeleton-text-xs"></div>
      </div>
    </section>

    <!-- Versions Section -->
    <section class="section versions-section">
      <div class="section-header">
        <div class="skeleton skeleton-heading"></div>
        <div class="skeleton skeleton-text skeleton-text-description"></div>
      </div>
      <div class="versions-table">
        <div class="table-header">
          <div class="skeleton skeleton-text skeleton-text-sm" style="width: 60px;"></div>
          <div class="skeleton skeleton-text skeleton-text-sm" style="width: 40px;"></div>
          <div class="skeleton skeleton-text skeleton-text-sm" style="width: 80px;"></div>
          <div class="skeleton skeleton-text skeleton-text-sm" style="width: 40px;"></div>
        </div>
        <div v-for="i in 5" :key="i" class="table-row">
          <div class="skeleton skeleton-text skeleton-text-base"></div>
          <div class="skeleton skeleton-text skeleton-text-sm"></div>
          <div class="skeleton skeleton-text skeleton-text-sm"></div>
          <div class="actions-cell">
            <div class="skeleton skeleton-button-sm"></div>
            <div class="skeleton skeleton-button-sm"></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.node-manager-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xl);
}

.section {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-lg);
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-xs);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--size-spacing-lg);
}

.summary-card {
  display: flex;
  gap: var(--size-spacing-md);
  padding: var(--size-spacing-lg);
  border-radius: var(--size-radius-lg);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-component);
  align-items: center;
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-2xs);
  flex: 1;
}

.manager-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--size-spacing-lg);
}

.manager-card {
  padding: var(--size-spacing-lg);
  border-radius: var(--size-radius-lg);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-component);
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-sm);
}

.manager-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--size-spacing-sm);
}

.manager-meta {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-2xs);
}

.install-form {
  display: flex;
  flex-direction: column;
  gap: var(--size-spacing-md);
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  padding: var(--size-spacing-lg);
  background: var(--color-bg-component);
}

.form-row {
  display: flex;
  gap: var(--size-spacing-sm);
  align-items: center;
}

.versions-table {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border-light);
  border-radius: var(--size-radius-lg);
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1.6fr 1.4fr;
  gap: var(--size-spacing-sm);
  padding: var(--size-spacing-md) var(--size-spacing-lg);
  align-items: center;
}

.table-header {
  background: var(--color-bg-layout);
}

.table-row:nth-child(even) {
  background: var(--color-bg-component);
}

.table-row + .table-row {
  border-top: 1px solid var(--color-border-light);
}

.actions-cell {
  display: flex;
  gap: var(--size-spacing-sm);
  flex-wrap: wrap;
  justify-content: flex-start;
}

/* Skeleton Styles */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-layout) 0%,
    var(--color-border-light) 50%,
    var(--color-bg-layout) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: var(--size-radius-sm);
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-heading {
  height: 28px;
  width: 200px;
  border-radius: var(--size-radius-md);
}

.skeleton-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--size-radius-full);
  flex-shrink: 0;
}

.skeleton-text {
  height: 16px;
  width: 100%;
}

.skeleton-text-xs {
  height: 14px;
  width: 80%;
}

.skeleton-text-sm {
  height: 14px;
  width: 90%;
}

.skeleton-text-base {
  height: 16px;
  width: 85%;
}

.skeleton-text-md {
  height: 18px;
  width: 120px;
}

.skeleton-text-lg {
  height: 24px;
  width: 70%;
}

.skeleton-text-description {
  height: 16px;
  width: 90%;
  margin-top: 4px;
}

.skeleton-tag {
  height: 22px;
  width: 60px;
  border-radius: var(--size-radius-full);
}

.skeleton-input {
  flex: 1;
  height: 40px;
  border-radius: var(--size-radius-md);
}

.skeleton-button {
  height: 40px;
  width: 100px;
  border-radius: var(--size-radius-md);
}

.skeleton-button-sm {
  height: 32px;
  width: 80px;
  border-radius: var(--size-radius-md);
}

@media (max-width: 960px) {
  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .actions-cell {
    justify-content: flex-start;
  }
}
</style>

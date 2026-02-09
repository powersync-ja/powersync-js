<template>
  <div class="loading-overlay">
    <div class="loading-content">
      <div class="spinner-icon"></div>
      <div class="loading-text">Loading...</div>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  z-index: 9999;
}

@media (prefers-color-scheme: dark) {
  .loading-overlay {
    background: #0a0a0a;
  }
  .loading-text {
    color: rgba(255, 255, 255, 0.7);
  }
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.loading-text {
  color: rgba(0, 0, 0, 0.7);
}

.spinner-icon {
  width: 36px;
  height: 36px;
  opacity: 0.5;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik03LjcgNC43YTE0LjcgMTQuNyAwIDAgMC0zIDMuMUw2LjMgOWExMy4zIDEzLjMgMCAwIDEgMi42LTIuN1ptLTMuMSA3LjZsLTEuOS0uNkExMi41IDEyLjUgMCAwIDAgMiAxNmgyYTExLjUgMTEuNSAwIDAgMSAuNi0zLjdtLTEuOSA4LjFhMTQuNCAxNC40IDAgMCAwIDIgMy45bDEuNi0xLjJhMTIuOSAxMi45IDAgMCAxLTEuNy0zLjNabTUuMSA2LjlhMTQuNCAxNC40IDAgMCAwIDMuOSAybC42LTEuOUExMi45IDEyLjkgMCAwIDEgOSAyNS43Wm0zLjktMjQuNmwuNiAxLjlBMTEuNSAxMS41IDAgMCAxIDE2IDRWMmExMi41IDEyLjUgMCAwIDAtNC4zLjdtMTIuNSAyNC42YTE1LjIgMTUuMiAwIDAgMCAzLjEtMy4xTDI1LjcgMjNhMTEuNSAxMS41IDAgMCAxLTIuNyAyLjdabTMuMi03LjZsMS45LjZBMTUuNSAxNS41IDAgMCAwIDMwIDE2aC0yYTExLjUgMTEuNSAwIDAgMS0uNiAzLjdtMS44LTguMWExNC40IDE0LjQgMCAwIDAtMi0zLjlsLTEuNiAxLjJhMTIuOSAxMi45IDAgMCAxIDEuNyAzLjNabS01LjEtN2ExNC40IDE0LjQgMCAwIDAtMy45LTJsLS42IDEuOWExMi45IDEyLjkgMCAwIDEgMy4zIDEuN1ptLTMuOCAyNC43bC0uNi0xLjlhMTEuNSAxMS41IDAgMCAxLTMuNy42djJhMjEuNCAyMS40IDAgMCAwIDQuMy0uNyIvPjwvc3ZnPg==');
  background-size: contain;
  background-repeat: no-repeat;
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

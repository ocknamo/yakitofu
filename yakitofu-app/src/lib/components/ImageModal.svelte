<script lang="ts">
let { src, alt, onClose }: { src: string; alt: string; onClose: () => void } = $props();

function handleClickOutside(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    onClose();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    onClose();
  }
}
</script>

<div
  class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
  onclick={handleClickOutside}
  onkeydown={handleKeyDown}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="relative max-w-4xl max-h-[90vh]">
    <!-- Close button -->
    <button
      class="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-lg"
      onclick={onClose}
      aria-label="Close"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>

    <!-- Image -->
    <img
      {src}
      {alt}
      class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
    />
  </div>
</div>
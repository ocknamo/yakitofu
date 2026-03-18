<script lang="ts">
let {
  src,
  placeholderSrc = '',
  alt,
  class: className = '',
}: {
  src: string;
  placeholderSrc?: string;
  alt: string;
  class?: string;
} = $props();

let loaded = $state(false);

function onLoad() {
  loaded = true;
}
</script>

<div class="progressive-image {className}">
  {#if placeholderSrc}
  <img
    src={placeholderSrc}
    alt=""
    aria-hidden="true"
    class="progressive-image__placeholder"
    class:progressive-image__placeholder--hidden={loaded}
    loading="lazy"
  />
  {:else}
    <div
      class="progressive-image__placeholder progressive-image__placeholder--solid"
      class:progressive-image__placeholder--hidden={loaded}
    ></div>
  {/if}
  <img
    src={src}
    {alt}
    class="progressive-image__full"
    class:progressive-image__full--loaded={loaded}
    onload={onLoad}
    loading="lazy"
  />
</div>

<style>
  .progressive-image {
    position: relative;
    overflow: hidden;
  }

  .progressive-image__placeholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: blur(16px);
    transform: scale(1.1);
    transition: opacity 0.4s ease-out;
  }

  .progressive-image__placeholder--solid {
    background-color: #e5e7eb;
    filter: none;
    transform: none;
  }

  .progressive-image__placeholder--hidden {
    opacity: 0;
    pointer-events: none;
  }

  .progressive-image__full {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    opacity: 0;
    transition: opacity 0.4s ease-out;
  }

  .progressive-image__full--loaded {
    opacity: 1;
  }
</style>

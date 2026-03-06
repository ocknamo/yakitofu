<script lang="ts">
  let {
    src,
    alt,
    class: className = '',
  }: {
    src: string;
    alt: string;
    class?: string;
  } = $props();

  let loaded = $state(false);

  function onLoad() {
    loaded = true;
  }
</script>

<div class="avatar {className}">
  <div class="avatar__placeholder" class:avatar__placeholder--hidden={loaded}></div>
  <img
    {src}
    {alt}
    class="avatar__img"
    class:avatar__img--loaded={loaded}
    onload={onLoad}
  />
</div>

<style>
  .avatar {
    position: relative;
    overflow: hidden;
    border-radius: 9999px;
  }

  .avatar__placeholder {
    position: absolute;
    inset: 0;
    background-color: #f3e8d8;
    transition: opacity 0.3s ease-out;
  }

  .avatar__placeholder--hidden {
    opacity: 0;
    pointer-events: none;
  }

  .avatar__img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    filter: blur(8px);
    transition: opacity 0.3s ease-out, filter 0.3s ease-out;
  }

  .avatar__img--loaded {
    opacity: 1;
    filter: blur(0);
  }
</style>

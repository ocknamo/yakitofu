<script lang="ts">
import { t } from '../stores/i18n';
import {
  formatImageSize,
  getImageSize,
  type ImageSize,
  isRecommendedSize,
} from '../utils/imageUtils';

interface Props {
  url: string;
  onSizeLoaded?: (size: ImageSize | null) => void;
  recommendedSize?: ImageSize;
}

let { url, onSizeLoaded, recommendedSize }: Props = $props();
let imageSize: ImageSize | null = $state(null);
let loading = $state(false);
let error = $state('');

$effect(() => {
  if (url) {
    loadImage();
  } else {
    imageSize = null;
    error = '';
  }
});

$effect(() => {
  if (onSizeLoaded) {
    onSizeLoaded(imageSize);
  }
});

async function loadImage() {
  loading = true;
  error = '';
  imageSize = null;

  try {
    const size = await getImageSize(url);
    imageSize = size;
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load image';
  } finally {
    loading = false;
  }
}
</script>

{#if url}
  <div class="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
    <h4 class="font-medium text-gray-700 mb-3">{$t('imagePreview')}</h4>
    {#if loading}
      <p class="text-gray-600">Loading...</p>
    {:else if error}
      <p class="text-red-600">{error}</p>
    {:else if imageSize}
      <img src={url} alt="Badge preview" class="max-w-[200px] max-h-[200px] rounded-md mb-2" loading="lazy" />
      <div class="text-sm space-y-1">
        <p class="text-gray-600">Size: {formatImageSize(imageSize)}</p>
        {#if recommendedSize && (imageSize.width !== recommendedSize.width || imageSize.height !== recommendedSize.height)}
          <p class="text-orange-600 font-semibold">
            Warning: Recommended size is {formatImageSize(recommendedSize)}. Current size: {formatImageSize(imageSize)}
          </p>
        {:else if !recommendedSize && !isRecommendedSize(imageSize)}
          <p class="text-orange-600 font-semibold">
            {$t('imageSizeWarning')} {formatImageSize(imageSize)}
          </p>
        {/if}
      </div>
    {/if}
  </div>
{/if}

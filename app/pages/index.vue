<script setup lang="ts">
import GalleryUpload from '~/components/GalleryUpload.vue';

const handleUploaded = (galleryUrl: string) => {
  console.log('Uploaded:', galleryUrl);
}
</script>

<template>
  <div class="component-name">
    <GalleryUpload @uploaded="handleUploaded" />
  </div>
</template>

<style scoped lang="css">
</style>

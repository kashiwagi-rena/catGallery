<script setup lang="ts">
import GalleryUpload from '~/components/GalleryUpload.vue';
import PhotoGalley from '~/components/PhotoGalley.vue';

const galleryRef = ref();

const handleUploaded = (galleryUrl: string) => {
  console.log('Uploaded:', galleryUrl);
  galleryRef.value?.loadPhotos();
}

const handleDelete = (photoId: string) => {
  console.log('Delete:', photoId);
}
</script>

<template>
  <div class="component-name">
    <GalleryUpload @uploaded="handleUploaded" />
    <PhotoGalley ref="galleryRef" @delete="handleDelete" />
  </div>
</template>

<style scoped lang="css">
</style>

<script setup lang="ts">
import GalleryUpload from "~/components/GalleryUpload.vue"
import PhotoGalley from "~/components/PhotoGalley.vue"

const galleryRef = ref()

const handleUploaded = () => {
	galleryRef.value?.loadPhotos()
}

</script>

<template>
  <div class="component-name">
    <GalleryUpload @uploaded="handleUploaded" />
    <PhotoGalley ref="galleryRef" />
  </div>
</template>

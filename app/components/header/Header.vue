<script setup lang="ts">
const goToRoot = () => {
  navigateTo("/")
}

const goToUpload = () => {
  navigateTo("/upload")
}

const goToGallery = () => {
  navigateTo("/")
}
</script>

<template>
  <div class="header">
    <div class="icon" @click="goToRoot">catGallery</div>
    <div class="rooter">
      <div @click="goToUpload">Upload</div>
      <div @click="goToGallery">Gallery</div>
    </div>
  </div>
</template>

<style scoped lang="css">
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  max-width: 100%;
  margin: 0;
  padding: 1rem 10%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.icon {
  font-size: 250%;
  color: #a52a2a;
  cursor: pointer;
}

.rooter {
  display: flex;
  gap: 2rem;
  color: #4bc645;
}

.rooter > div {
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.rooter > div:hover {
  background-color: #f0f0f0;
}
</style>

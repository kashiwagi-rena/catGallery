<script setup lang="ts">
import { usePhotoList } from "~/composables/usePhotoList"
import type { Gallery } from "~/types/gallery"

const photos = ref<Gallery[]>([])
const isLoading = ref(false)
const errorMessage = ref("")
const selectedPhoto = ref<Gallery | null>(null)
const isDeleting = ref(false)
const deleteSuccessMessage = ref("")
const deleteErrorMessage = ref("")

const { getPhotos } = usePhotoList()
const { deletePhoto } = usePhotoDelete()

// Emitイベント定義
const emit = defineEmits<{
	delete: [photoId: string]
}>()

/**
 * 写真を読み込む
 */
const loadPhotos = async () => {
	isLoading.value = true
	errorMessage.value = ""

	try {
		photos.value = await getPhotos()
	} catch (err) {
		console.error("Load photos error:", err)
		errorMessage.value = "写真の読み込みに失敗しました"
	} finally {
		isLoading.value = false
	}
}

/**
 * モーダルを開く
 */
const openModal = (photo: Gallery) => {
	selectedPhoto.value = photo
}

/**
 * モーダルを閉じる
 */
const closeModal = () => {
	selectedPhoto.value = null
}

/**
 * 削除確認
 */
const confirmDelete = () => {
	if (!selectedPhoto.value) return

	const confirmed = window.confirm(
		`「${selectedPhoto.value.name}」を削除しますか？\nこの操作は取り消せません。`,
	)

	if (confirmed) {
		handleDelete(selectedPhoto.value.id)
	}
}

/**
 * 削除処理
 */
const handleDelete = async (photoId: string) => {
	isDeleting.value = true
	deleteSuccessMessage.value = ""
	deleteErrorMessage.value = ""

	try {
		// selectedPhotoからファイル名を取得してSupabaseで削除
		const fileName = selectedPhoto.value?.name
		if (!fileName) {
			throw new Error('ファイル名が見つかりません')
		}

		const result = await deletePhoto(fileName)

		// ギャラリーから削除（IDで比較）
		photos.value = photos.value.filter((photo) => photo.id !== photoId)

		// 成功メッセージ
		deleteSuccessMessage.value = result.message
		setTimeout(() => {
			deleteSuccessMessage.value = ""
		}, 3000)

		// モーダルを閉じる
		closeModal()
	} catch (err) {
		console.error("Delete error:", err)
		deleteErrorMessage.value = err instanceof Error ? err.message : "削除に失敗しました"
		setTimeout(() => {
			deleteErrorMessage.value = ""
		}, 5000)
	} finally {
		isDeleting.value = false
	}
}

/**
 * 日付のフォーマット
 */
const formatDate = (dateString: string): string => {
	const date = new Date(dateString)
	return date.toLocaleDateString("ja-JP", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

/**
 * ファイルサイズのフォーマット
 */
const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes"
	const k = 1024
	const sizes = ["Bytes", "KB", "MB"]
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

// コンポーネントマウント時に写真を読み込む
onMounted(() => {
	loadPhotos()
})

// 外部から再読み込みできるようにする
defineExpose({
	loadPhotos,
})
</script>

<template>
  <div class="gallery-container">
    <h2>🖼️ 猫の写真ギャラリー 🖼️</h2>

    <!-- ローディング状態 -->
    <div v-if="isLoading" class="loading">
      <p>📥 読み込み中...</p>
    </div>

    <!-- エラー状態 -->
    <div v-else-if="errorMessage" class="error">
      <p>⚠️ {{ errorMessage }}</p>
      <button @click="loadPhotos" class="retry-button">再読み込み</button>
    </div>

    <!-- 空状態 -->
    <div v-else-if="photos.length === 0" class="empty">
      <p class="empty__icon">📸</p>
      <p class="empty__text">まだ写真がアップロードされていません</p>
      <p class="empty__subtext">上のフォームから猫の写真をアップロードしてみましょう！</p>
    </div>

    <!-- ギャラリーグリッド -->
    <div v-else class="gallery-grid">
      <div
        v-for="photo in photos"
        :key="photo.id"
        class="gallery-item"
        @click="openModal(photo)"
      >
        <img
          :src="photo.url"
          :alt="photo.name"
          class="gallery-item__image"
          loading="lazy"
        />
        <div class="gallery-item__overlay">
          <p class="gallery-item__date">
            {{ formatDate(photo.created_at) }}
          </p>
        </div>
      </div>
    </div>

    <!-- モーダル（拡大表示） -->
    <div v-if="selectedPhoto" class="modal" @click="closeModal">
      <div class="modal__content" @click.stop>
        <button class="modal__close" @click="closeModal">✕</button>
        <img
          :src="selectedPhoto.url"
          :alt="selectedPhoto.name"
          class="modal__image"
        />
        <div class="modal__info">
          <p><strong>{{ selectedPhoto.name }}</strong></p>
          <p>{{ formatDate(selectedPhoto.created_at) }}</p>
          <p>{{ formatFileSize(selectedPhoto.size) }}</p>
        </div>
        <!-- モーダル内の削除ボタン -->
        <div v-if="selectedPhoto" class="modal" @click="closeModal">
          <div class="modal__content" @click.stop>
            <button class="modal__close" @click="closeModal">✕</button>
            <img
              :src="selectedPhoto.url"
              :alt="selectedPhoto.name"
              class="modal__image"
            />
            <div class="modal__info">
              <p><strong>{{ selectedPhoto.name }}</strong></p>
              <p>{{ formatDate(selectedPhoto.created_at) }}</p>
              <p>{{ formatFileSize(selectedPhoto.size) }}</p>
            </div>
            <button
              class="modal__delete"
              :disabled="isDeleting"
              @click="confirmDelete"
            >
              <span v-if="!isDeleting">🗑️ 削除</span>
              <span v-else>⏳ 削除中...</span>
            </button>
          </div>
        </div>

        <!-- 削除成功メッセージ -->
        <div v-if="deleteSuccessMessage" class="success-toast">
          ✅ {{ deleteSuccessMessage }}
        </div>

        <!-- 削除エラーメッセージ -->
        <div v-if="deleteErrorMessage" class="error-toast">
          ⚠️ {{ deleteErrorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-container {
  max-width: 1200px;
  margin: 3rem auto 0;
  padding: 2rem 1rem;
}

h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 3rem 2rem;
  background-color: #fff;
  border-radius: 12px;
}

.loading p {
  font-size: 1.2rem;
  color: #666;
}

.error p {
  color: #c62828;
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.75rem 2rem;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.retry-button:hover {
  background-color: #1976D2;
}

.empty__icon {
  font-size: 5rem;
  margin: 0;
}

.empty__text {
  font-size: 1.3rem;
  color: #666;
  margin: 1rem 0 0.5rem;
}

.empty__subtext {
  color: #999;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.gallery-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  background-color: #f0f0f0;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.gallery-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.gallery-item__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-item__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  color: white;
  padding: 1rem;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.gallery-item:hover .gallery-item__overlay {
  transform: translateY(0);
}

.gallery-item__name {
  font-weight: 600;
  margin: 0 0 0.25rem;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gallery-item__date {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.9;
}

/* モーダル */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal__content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  background-color: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal__close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__close:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

.modal__image {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  background-color: #000;
}

.modal__info {
  padding: 0.3rem 1.5rem;
  background-color: #f5f5f5;
  gap: 0.5rem
}

.modal__delete {
  margin: 1rem;
  padding: 0.75rem;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
}

.modal__delete:hover {
  background-color: #d32f2f;
}

.modal__delete:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

/* トーストメッセージ */
.success-toast,
.error-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  animation: slideIn 0.3s ease;
}

.success-toast {
  background-color: #4CAF50;
  color: white;
}

.error-toast {
  background-color: #f44336;
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .success-toast,
  .error-toast {
    right: 1rem;
    left: 1rem;
    bottom: 1rem;
  }
}

/* レスポンシブ */
@media (max-width: 768px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }

  .modal {
    padding: 1rem;
  }

  .modal__image {
    max-height: 60vh;
  }
}
</style>

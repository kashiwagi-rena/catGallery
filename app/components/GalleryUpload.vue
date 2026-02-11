<script setup lang="ts">
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string>("")
const isDragging = ref(false)
const isUploading = ref(false)
const errorMessage = ref<string>("")
const successMessage = ref<string>("")

const { uploadGallery: uploadToSupabase } = useGalleryUpload()

// Emitイベント定義
const emit = defineEmits<{
	uploaded: [photoUrl: string]
}>()

/**
 * ファイル選択ハンドラ
 */
const handleFileSelect = (event: Event) => {
	const target = event.target as HTMLInputElement
	if (target.files && target.files[0]) {
		processFile(target.files[0])
	}
}

/**
 * ドロップハンドラ
 */
const handleDrop = (event: DragEvent) => {
	isDragging.value = false
	const files = event.dataTransfer?.files
	if (files && files[0]) {
		processFile(files[0])
	}
}

/**
 * ファイル処理
 */
const processFile = (file: File) => {
	errorMessage.value = ""
	successMessage.value = ""

	// ファイルタイプチェック
	if (!file.type.startsWith("image/")) {
		errorMessage.value = "画像ファイルを選択してください"
		return
	}

	// ファイルサイズチェック（5MB制限）
	const maxSize = 5 * 1024 * 1024 // 5MB
	if (file.size > maxSize) {
		errorMessage.value = "ファイルサイズは5MB以下にしてください"
		return
	}

	selectedFile.value = file

	// プレビュー生成
	const reader = new FileReader()
	reader.onload = (e) => {
		previewUrl.value = e.target?.result as string
	}
	reader.readAsDataURL(file)
}

/**
 * 選択解除
 */
const clearSelection = () => {
	selectedFile.value = null
	previewUrl.value = ""
	errorMessage.value = ""
	successMessage.value = ""
}

/**
 * アップロード処理（次のIssueで実装）
 */
const uploadPhoto = async () => {
	if (!selectedFile.value) return

	isUploading.value = true
	errorMessage.value = ""
	successMessage.value = ""

	try {
		const result = await uploadToSupabase(selectedFile.value)

		if (result.success && result.data) {
			successMessage.value = "アップロードが完了しました！"

			emit("uploaded", result.data.url)

			setTimeout(() => {
				clearSelection()
				successMessage.value = ""
			}, 2000)
		} else {
			errorMessage.value = result.error || "アップロードに失敗しました"
		}
	} catch (err) {
		console.error("Upload error:", err)
		errorMessage.value = "アップロード中にエラーが発生しました"
	} finally {
		isUploading.value = false
	}
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
</script>

<template>
  <div class="upload-container">
    <h2>🐈ྀི 猫の写真をアップロード 🐈</h2>

    <!-- ドラッグ&ドロップエリア -->
    <div
      class="drop-zone"
      :class="{ 'drop-zone--dragover': isDragging }"
      @drop.prevent="handleDrop"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
    >
      <div v-if="!previewUrl" class="drop-zone__content">
        <p class="drop-zone__icon">📸</p>
        <p class="drop-zone__text">
          ここに画像をドラッグ&ドロップ<br />
          または
        </p>
        <label class="drop-zone__button">
          <input
            type="file"
            accept="image/*"
            @change="handleFileSelect"
            hidden
          />
          ファイルを選択
        </label>
      </div>

      <!-- プレビュー -->
      <div v-else class="preview">
        <img :src="previewUrl" alt="プレビュー" class="preview__image" />
        <button @click="clearSelection" class="preview__clear">
          ✕ 選択解除
        </button>
      </div>
    </div>

    <!-- ファイル情報 -->
    <div v-if="selectedFile" class="file-info">
      <p><strong>ファイル名:</strong> {{ selectedFile.name }}</p>
      <p><strong>サイズ:</strong> {{ formatFileSize(selectedFile.size) }}</p>
    </div>

    <!-- アップロードボタン -->
    <button
      v-if="selectedFile"
      @click="uploadPhoto"
      :disabled="isUploading"
      class="upload-button"
      :class="{ 'upload-button--loading': isUploading }"
    >
      <span v-if="!isUploading">📤 アップロード</span>
      <span v-else>⏳ アップロード中...</span>
    </button>

    <!-- エラーメッセージ -->
    <div v-if="errorMessage" class="error-message">
      ⚠️ {{ errorMessage }}
    </div>

    <!-- 成功メッセージ -->
    <div v-if="successMessage" class="success-message">
      ✅ {{ successMessage }}
    </div>
  </div>
</template>


<style scoped>
.upload-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
}

.drop-zone {
  border: 3px dashed #ccc;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  background-color: #fff;
  transition: all 0.3s ease;
  cursor: pointer;
}

.drop-zone:hover {
  border-color: #999;
  background-color: #f9f9f9;
}

.drop-zone--dragover {
  border-color: #4CAF50;
  background-color: #e8f5e9;
}

.drop-zone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.drop-zone__icon {
  font-size: 4rem;
  margin: 0;
}

.drop-zone__text {
  color: #666;
  margin: 0;
}

.drop-zone__button {
  display: inline-block;
  padding: 0.75rem 2rem;
  background-color: #4CAF50;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s;
}

.drop-zone__button:hover {
  background-color: #45a049;
}

.preview {
  position: relative;
}

.preview__image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
  object-fit: contain;
}

.preview__clear {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: rgba(255, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 20%;
  width: 60px;
  height: 80px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview__clear:hover {
  background-color: rgba(255, 0, 0, 1);
}

.file-info {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.file-info p {
  margin: 0.25rem 0;
  color: #666;
}

.upload-button {
  width: 100%;
  margin-top: 1rem;
  padding: 1rem;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.upload-button:hover:not(:disabled) {
  background-color: #1976D2;
}

.upload-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.upload-button--loading {
  background-color: #FF9800;
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 10px;
  border-left: 4px solid #c62828;
}

.success-message {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #e8f5e9;
  color: #2e7d32;
  border-radius: 8px;
  border-left: 4px solid #2e7d32;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .upload-container {
    padding: 1rem;
  }

  .drop-zone {
    padding: 2rem 1rem;
  }

  .drop-zone__icon {
    font-size: 3rem;
  }
}
</style>

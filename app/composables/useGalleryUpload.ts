import type { UploadResult } from '../types/gallery.ts'

export const useGalleryUpload = () => {
  const supabase = useSupabase()

  /**
   * 画像をSupabase Storageにアップロード
   * @param file アップロードするファイル
   * @returns アップロード結果
   */
  const uploadGallery = async (file: File): Promise<UploadResult> => {
    try {
      // ファイル名を生成（重複を避けるためタイムスタンプを使用）
      const timestamp = Date.now()
      const fileName = `${timestamp}_${file.name}`
      const filePath = `photos/${fileName}`

      // Supabase Storageにアップロード
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false, // 同名ファイルの上書きを防ぐ
        })

      if (error) {
        console.error('Upload error:', error)
        return {
          success: false,
          error: `アップロードに失敗しました: ${error.message}`,
        }
      }

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath)

      return {
        success: true,
        data: {
          id: data.path,
          name: file.name,
          url: urlData.publicUrl,
          created_at: new Date().toISOString(),
          size: file.size,
        },
      }
    } catch (err) {
      console.error('Upload exception:', err)
      return {
        success: false,
        error: 'アップロード中に予期しないエラーが発生しました',
      }
    }
  }

  return {
    uploadGallery,
  }
}

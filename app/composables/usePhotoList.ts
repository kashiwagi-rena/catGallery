import type { Gallery, SupabaseFileObject } from '../types/gallery.ts'

export const usePhotoList = () => {
  const supabase = useSupabase()

  /**
   * 画像一覧を取得
   * @returns 画像の配列
   */
  const getPhotos = async (): Promise<Gallery[]> => {
    try {
      // photos/ フォルダ内のファイル一覧を取得
      const { data: files, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list('photos', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        })

      if (error) {
        console.error('List files error:', error)
        throw new Error(`ファイル一覧の取得に失敗しました: ${error.message}`)
      }

      if (!files || files.length === 0) {
        return []
      }

      // 各ファイルの公開URLを取得してPhoto型に変換
      const photos: Gallery[] = files
        .filter((file: SupabaseFileObject) => file.name !== '.emptyFolderPlaceholder') // 空フォルダプレースホルダーを除外
        .map((file: SupabaseFileObject) => {
          const filePath = `photos/${file.name}`
          const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath)

          return {
            id: file.id,
            name: file.name,
            url: urlData.publicUrl,
            created_at: file.created_at,
            size: file.metadata.size,
          }
        })

      return photos
    } catch (err) {
      throw err
    }
  }

  return {
    getPhotos,
  }
}

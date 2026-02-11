export const usePhotoDelete = () => {
  const supabase = useSupabase()

  /**
   * 画像を削除
   * @param fileName ファイル名（例: "1234567890_cat.jpg"）
   * @returns 削除成功かどうかと成功メッセージ
   */
  const deletePhoto = async (fileName: string): Promise<{ success: boolean; message: string }> => {
    try {
      // ファイルパスを構築
      const filePath = `photos/${fileName}`

      console.log('削除開始:', {
        fileName,
        filePath,
        bucket: STORAGE_BUCKET
      })

      // Supabase Storageから削除
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filePath])


      if (error) {
        throw new Error(`削除に失敗しました: ${error.message}`)
      }

      return {
        success: true,
        message: '画像を正常に削除しました'
      }
    } catch (err) {
      console.error('Delete exception:', err)
      throw err
    }
  }

  return {
    deletePhoto,
  }
}

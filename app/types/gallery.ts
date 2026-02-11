/**
 * 写真のメタデータ
 */
export interface Gallery {
    id: string
    name: string
    url: string
    created_at: string
    size: number
}

/**
 * アップロード結果の型
 */
export interface UploadResult {
    success: boolean
    data?: Gallery
    error?: string
}

/**
 * Supabaseファイルオブジェクトの型
 */
export interface SupabaseFileObject {
    id: string
    name: string
    created_at: string
    last_accessed_at: string
    updated_at: string
    metadata: {
        eTag: string
        size: number
        mimetype: string
        cacheControl: string
        lastModified: string
    }
}

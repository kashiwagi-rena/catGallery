/**
 * 写真のメタデータ
 */
export interface Gallery {
    id: string
    name: string
    url:string
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

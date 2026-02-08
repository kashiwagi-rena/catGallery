<template>
  <div>
    <h1>Supabase接続テスト</h1>
    <button @click="testConnection">接続テスト</button>
    <p v-if="result">{{ result }}</p>
  </div>
</template>

<script setup lang="ts">
import { useSupabase } from '~/composables/useSupabase'

const result = ref<string>('')

const testConnection = async () => {
  try {
    const supabase = useSupabase()

    // バケット一覧を取得してみる
    const { data, error } = await supabase.storage.listBuckets()

    if (error) {
      result.value = `エラー: ${error.message}`
    } else {
      result.value = `成功！バケット数: ${data?.length}`
      console.log('Buckets:', data)
    }
  } catch (err) {
    result.value = `例外発生: ${err}`
  }
}
</script>

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchImages, uploadImage, deleteImage, type ImageInfo } from '../api/client'

export const useImageStore = defineStore('images', () => {
  const images = ref<ImageInfo[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try { images.value = await fetchImages() } catch (e) { console.error('[images] load error:', e) }
    loading.value = false
  }

  async function upload(file: File) {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
    const img = await uploadImage(file.name, base64)
    images.value.unshift(img)
    return img
  }

  async function remove(id: string) {
    await deleteImage(id)
    images.value = images.value.filter(i => i.id !== id)
  }

  return { images, loading, load, upload, remove }
})

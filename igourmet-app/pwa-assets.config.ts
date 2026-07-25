import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icon nguồn (public/pwa-source.svg) đã là hình vuông nền amber tràn viền,
// nĩa/dao căn giữa trong safe-zone -> tắt padding để nền tràn cạnh (maskable/apple
// không bị viền trắng). Không đụng nội dung, chỉ chỉnh cách sinh icon.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0 },
    apple: { ...minimal2023Preset.apple, padding: 0 },
  },
  images: ['public/pwa-source.svg'],
})

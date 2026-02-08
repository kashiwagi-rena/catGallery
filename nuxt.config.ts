// https://nuxt.com/docs/api/configuration/nuxt-config
import process from "node:process";
export default defineNuxtConfig({
	compatibilityDate: "2025-07-15",
	devtools: { enabled: true },

	modules: [],

  css: ['~/assets/css/main.css'],

	// runtimeConfig: {
	// 	public: {
	// 		supabaseUrl: process.env.SUPABASE_URL,
	// 		supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
	// 	},
	// },

	app: {
		head: {
			title: "Cat Gallery",
			meta: [
				{ charset: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{
					name: "description",
					content: "ねこの写真を保存・閲覧できるギャラリーアプリ",
				},
			],
		},
	},

})

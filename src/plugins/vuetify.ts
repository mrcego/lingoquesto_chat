/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'customLight',
    themes: {
      customLight: {
        dark: false,
        colors: {
          background: '#FDFDFD',
          surface: '#EAEFF3',
          primary: '#2B2F4B',
          secondary: '#4C506D',
          accent: '#B6643A',
          info: '#8D8F9D',
          success: '#D5D8E2',
          warning: '#BDBCBD',
          error: '#B6643A'
        }
      },
      customDark: {
        dark: true,
        colors: {
          background: '#2B2F4B',
          surface: '#4C506D',
          primary: '#EAEFF3',
          secondary: '#D5D8E2',
          accent: '#B6643A',
          info: '#BDBCBD',
          success: '#8D8F9D',
          warning: '#EAEFF3',
          error: '#B6643A'
        }
      }
    }
  }
})

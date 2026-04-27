import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

const NO_APICLIENT_RAW = {
  selector: "MemberExpression[object.name='ApiClient'][property.name='_supabaseInterno']",
  message:
    'ApiClient._supabaseInterno é de uso exclusivo de src/api/. Em services/pages/contexts use métodos semânticos do ApiClient ou do AuthClient.',
}

const NO_APICLIENT_IN_UI = {
  selector: "ImportDeclaration[source.value=/\\/api\\/client$/]",
  message:
    'Pages/components/contexts não devem importar ApiClient. Consumir via um service em src/services/.',
}

const NO_RAW_SUPABASE = {
  selector: "ImportDeclaration[source.value='@supabase/supabase-js']",
  message:
    'createClient do Supabase só deve aparecer em src/api/client.js. Qualquer acesso externo deve passar pelo ApiClient.',
}

const NO_RAW_INPUT = {
  selector: "JSXOpeningElement[name.name='input']",
  message:
    '<input> cru não é permitido. Use SafeInput de src/components/ui/SafeInput.jsx (garante maxLength e clamp numérico).',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^[A-Z_]',
          argsIgnorePattern: '^(_|[A-Z])',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-restricted-syntax': ['error', NO_APICLIENT_RAW],
    },
  },
  // Pages, components e contexts NÃO podem importar ApiClient diretamente nem usar <input>.
  {
    files: ['src/pages/**/*.{js,jsx}', 'src/components/**/*.{js,jsx}', 'src/contexts/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': ['error', NO_APICLIENT_RAW, NO_APICLIENT_IN_UI, NO_RAW_SUPABASE, NO_RAW_INPUT],
    },
  },
  // Único lugar onde <input> cru é permitido.
  {
    files: ['src/components/ui/SafeInput.jsx'],
    rules: {
      'no-restricted-syntax': ['error', NO_APICLIENT_RAW, NO_APICLIENT_IN_UI, NO_RAW_SUPABASE],
    },
  },
  // Camada src/api/ pode usar _supabaseInterno e @supabase/supabase-js.
  {
    files: ['src/api/**/*.{js,jsx}'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
])

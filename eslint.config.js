import tseslint from 'typescript-eslint';
import eslintPluginImport from 'eslint-plugin-import';

export default tseslint.config(
  {
    // グローバル設定
    ignores: [
      // ビルド出力
      '**/dist/**',
      '**/cdk.out/**',
      '**/build/**',
      '**/out/**',
      
      // 依存関係
      '**/node_modules/**',
      
      // 設定ファイル
      'eslint.config.js',
      'jest.config.js',
      'babel.config.js',
      'webpack.config.js',
      
      // その他
      '**/coverage/**',
      '**/*.d.ts',
      '**/*.js.map',
      '**/*.tsbuildinfo',
      '**/.DS_Store',
      
      // Dify-self-hosted-on-aws フォルダを除外
      '**/dify-self-hosted-on-aws/**',
    ],
  },
  
  // TypeScript ESLint 推奨設定
  tseslint.configs.recommended,
  
  // import プラグイン設定
  {
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      // インポート関連のルール
      'import/order': [
        'error',
        {
          'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          'alphabetize': { order: 'asc', caseInsensitive: true }
        }
      ],
    },
  },
  
  // 共通ルール
  {
    rules: {
      // TypeScript 固有のルール
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // 一般的なルール
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn',
      'spaced-comment': ['warn', 'always'],
    },
  },
  
  // CDK プロジェクト固有の設定
  {
    files: ['**/packages/cdk/**/*.ts'],
    rules: {
      // CDK プロジェクト固有のルール
      'no-new': 'off', // CDK では new Construct() パターンが一般的なため
      '@typescript-eslint/no-non-null-assertion': 'off', // CDK では非 null アサーションが必要な場合がある
      
      // CDK プロジェクトでは console.log を許可
      'no-console': 'off',
    },
  },
);

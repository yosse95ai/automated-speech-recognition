# Zod Validation Implementation Guide

本ガイドでは、自動音声認識システムにおけるZodベースの検証の実装パターンと使用例を説明します。

## 目次

1. [概要](#概要)
2. [基本的な使い方](#基本的な使い方)
3. [実装パターン](#実装パターン)
4. [エラーハンドリング](#エラーハンドリング)
5. [CDKとの統合](#cdkとの統合)
6. [テストパターン](#テストパターン)

## 概要

このプロジェクトでは、以下の目的でZodを使用しています：

- **型安全性**: TypeScriptの型とランタイム検証の一致
- **早期エラー検出**: デプロイ前の設定エラーの検出
- **明確なエラーメッセージ**: 日本語での分かりやすいエラー表示
- **ドキュメント化**: スキーマ自体がドキュメントとして機能

## 基本的な使い方

### 1. 環境設定の検証

```typescript
import { validateEnvironmentProps } from './lib/schemas';

// デプロイ設定の検証
try {
  const config = validateEnvironmentProps({
    awsRegion: 'ap-northeast-1',
    awsAccount: '123456789012',
    bucketName: 'my-asr-bucket-2024',
    apiVpcCidr: '10.0.0.0/16',
    onpremiseCidr: '10.1.0.0/16',
    debugMode: false,
    useTranscribe: true,
    useBedrockAgents: false,
    useS3OnpremDirectly: false,
    useR53ResolverEndpoint: true,
    useInternalNlb: false,
  });
  
  console.log('設定は有効です:', config);
} catch (error) {
  console.error('設定エラー:', error);
  process.exit(1);
}
```

### 2. Transcribe入力の検証

```typescript
import { validateTranscribeInput } from './lib/schemas';

// 音声認識ジョブの入力検証
const transcribeInput = validateTranscribeInput({
  s3Uri: 's3://my-bucket/recordings/meeting-2024-01-15.mp3',
  languageCode: 'ja-JP',
  mediaFormat: 'mp3',
  mediaSampleRateHertz: 44100,
  showSpeakerLabels: true,
  maxSpeakerLabels: 4,
});

console.log('Transcribeジョブを開始します:', transcribeInput);
```

### 3. S3バケット設定の検証

```typescript
import { validateS3BucketProps } from './lib/schemas';

// バケット設定の検証
const bucketConfig = validateS3BucketProps({
  bucketName: 'asr-audio-files-prod',
  objectExpirationDays: 30,
  vpcEndpointId: 'vpce-0a1b2c3d4e5f6g7h8',
});

console.log('バケット設定:', bucketConfig);
```

## 実装パターン

### パターン1: 安全な検証（エラーを返す）

ユーザー入力や外部データの検証に適しています。

```typescript
import { safeValidateEnvironmentProps } from './lib/schemas';

function loadConfiguration(userInput: unknown) {
  const result = safeValidateEnvironmentProps(userInput);
  
  if (!result.success) {
    // エラーをユーザーに表示
    result.errors.forEach(error => {
      console.error(`❌ ${error}`);
    });
    return null;
  }
  
  // 検証済みのデータを使用
  return result.data;
}
```

### パターン2: 厳密な検証（例外を投げる）

内部処理や必須の検証に適しています。

```typescript
import { validateTranscribeInput } from './lib/schemas';

function startTranscriptionJob(rawInput: unknown) {
  // 検証失敗時は例外が投げられる
  const input = validateTranscribeInput(rawInput);
  
  // ここでは型安全にinputを使用できる
  return transcribeService.startJob({
    mediaUri: input.s3Uri,
    language: input.languageCode,
    // ... 他のパラメータ
  });
}
```

### パターン3: CDK統合（スタック合成時の検証）

```typescript
import { EnvironmentValidator } from './lib/validators/environment-validator';
import * as cdk from 'aws-cdk-lib';

export class MyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyStackProps) {
    super(scope, id, props);
    
    // CDK検証として追加
    const validator = new EnvironmentValidator({
      apiVpcCidr: props.apiVpcCidr,
      onpremiseCidr: props.onpremiseCidr,
    });
    
    // スタック合成時にvalidate()が自動的に呼ばれる
    cdk.Annotations.of(this).addInfo(
      `Validating with ${validator.constructor.name}`
    );
  }
}
```

### パターン4: 部分的な検証

特定のフィールドのみを検証する場合：

```typescript
import { environmentPropsSchema } from './lib/schemas';

// 特定のフィールドのみ抽出
const bucketNameSchema = environmentPropsSchema.shape.bucketName;
const awsAccountSchema = environmentPropsSchema.shape.awsAccount;

// 個別に検証
const validBucketName = bucketNameSchema.parse('my-bucket-name');
const validAccount = awsAccountSchema.parse('123456789012');
```

### パターン5: カスタムバリデーション

既存のスキーマを拡張する場合：

```typescript
import { z } from 'zod';
import { environmentPropsSchema } from './lib/schemas';

// 追加の検証ルールを適用
const strictEnvironmentSchema = environmentPropsSchema.refine(
  (data) => {
    // 本番環境ではdebugModeをfalseに制限
    if (data.awsRegion.startsWith('prod-') && data.debugMode) {
      return false;
    }
    return true;
  },
  {
    message: '本番環境ではデバッグモードを有効にできません',
  }
);

const config = strictEnvironmentSchema.parse(rawData);
```

## エラーハンドリング

### エラー情報の詳細取得

```typescript
import { z } from 'zod';
import { environmentPropsSchema } from './lib/schemas';

try {
  environmentPropsSchema.parse(invalidData);
} catch (error) {
  if (error instanceof z.ZodError) {
    // 各エラーの詳細を取得
    error.errors.forEach((err) => {
      console.log('フィールド:', err.path.join('.'));
      console.log('エラー:', err.message);
      console.log('エラーコード:', err.code);
    });
    
    // フォーマットされたエラーメッセージ
    console.log('全エラー:', error.format());
  }
}
```

### カスタムエラーメッセージ

```typescript
import { safeValidateEnvironmentProps } from './lib/schemas';

function validateAndFormat(data: unknown) {
  const result = safeValidateEnvironmentProps(data);
  
  if (!result.success) {
    // エラーメッセージをフォーマット
    const formattedErrors = result.errors.map((error, index) => {
      return `${index + 1}. ${error}`;
    }).join('\n');
    
    throw new Error(`設定の検証に失敗しました:\n${formattedErrors}`);
  }
  
  return result.data;
}
```

### エラーの集約とレポート

```typescript
interface ValidationReport {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value: unknown;
  }>;
}

function generateValidationReport(data: unknown): ValidationReport {
  const result = safeValidateEnvironmentProps(data);
  
  if (result.success) {
    return { isValid: true, errors: [] };
  }
  
  // エラー詳細を構造化
  const errors = result.errors.map(errorMsg => {
    const [field, ...messageParts] = errorMsg.split(':');
    return {
      field: field.trim(),
      message: messageParts.join(':').trim(),
      value: (data as any)?.[field],
    };
  });
  
  return { isValid: false, errors };
}

// 使用例
const report = generateValidationReport(userConfig);
if (!report.isValid) {
  console.table(report.errors);
}
```

## CDKとの統合

### スタック定義での使用

```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvironmentValidator } from './lib/validators/environment-validator';
import { validateEnvironmentProps } from './lib/schemas';

interface AppStackProps extends cdk.StackProps {
  config: unknown; // 外部から渡される設定
}

export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);
    
    // 1. 設定を検証
    const validConfig = validateEnvironmentProps(props.config);
    
    // 2. CDK検証器を追加
    const validator = new EnvironmentValidator({
      apiVpcCidr: validConfig.apiVpcCidr,
      onpremiseCidr: validConfig.onpremiseCidr,
    });
    
    // 検証結果を記録
    const errors = validator.validate();
    if (errors.length > 0) {
      errors.forEach(error => {
        cdk.Annotations.of(this).addError(error);
      });
      throw new Error('環境設定の検証に失敗しました');
    }
    
    // 3. 検証済みの設定でリソースを作成
    // ...
  }
}
```

### コンストラクトでの使用

```typescript
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { validateTranscribeVpcEndpointProps } from './lib/schemas';

export class ValidatedTranscribeEndpoint extends Construct {
  constructor(scope: Construct, id: string, props: unknown) {
    super(scope, id);
    
    // プロパティを検証
    const validProps = validateTranscribeVpcEndpointProps(props);
    
    // 検証済みプロパティでリソース作成
    const endpoint = new ec2.InterfaceVpcEndpoint(this, 'Endpoint', {
      vpc: validProps.vpc as any, // CDK型へのキャスト
      service: ec2.InterfaceVpcEndpointAwsService.TRANSCRIBE,
      subnets: { subnets: validProps.subnets as any },
    });
  }
}
```

## テストパターン

### 成功ケースのテスト

```typescript
import { validateEnvironmentProps } from '../lib/schemas';

describe('環境設定の検証', () => {
  test('有効な設定を受け入れる', () => {
    const validConfig = {
      awsRegion: 'ap-northeast-1',
      awsAccount: '123456789012',
      bucketName: 'test-bucket',
      apiVpcCidr: '10.0.0.0/16',
      onpremiseCidr: '10.1.0.0/16',
    };
    
    expect(() => validateEnvironmentProps(validConfig)).not.toThrow();
    const result = validateEnvironmentProps(validConfig);
    expect(result.awsRegion).toBe('ap-northeast-1');
  });
});
```

### 失敗ケースのテスト

```typescript
import { safeValidateEnvironmentProps } from '../lib/schemas';

describe('環境設定の検証エラー', () => {
  test('無効なAWSアカウントIDを拒否する', () => {
    const invalidConfig = {
      awsRegion: 'us-east-1',
      awsAccount: '12345', // 短すぎる
      bucketName: 'test-bucket',
      apiVpcCidr: '10.0.0.0/16',
      onpremiseCidr: '10.1.0.0/16',
    };
    
    const result = safeValidateEnvironmentProps(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('12桁');
    }
  });
  
  test('CIDRプレフィックスが大きすぎる場合を拒否する', () => {
    const invalidConfig = {
      awsRegion: 'us-east-1',
      awsAccount: '123456789012',
      bucketName: 'test-bucket',
      apiVpcCidr: '10.0.0.0/26', // /25より大きい
      onpremiseCidr: '10.1.0.0/16',
    };
    
    const result = safeValidateEnvironmentProps(invalidConfig);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('/25');
    }
  });
});
```

### スナップショットテスト

```typescript
import { environmentPropsSchema } from '../lib/schemas';

describe('スキーマ定義', () => {
  test('スキーマ構造のスナップショット', () => {
    // スキーマの構造を記録
    expect(environmentPropsSchema.shape).toMatchSnapshot();
  });
  
  test('エラーメッセージのスナップショット', () => {
    const result = environmentPropsSchema.safeParse({
      awsAccount: 'invalid',
    });
    
    if (!result.success) {
      expect(result.error.errors).toMatchSnapshot();
    }
  });
});
```

## ベストプラクティス

### 1. 早期検証

```typescript
// ❌ 悪い例: 使用時まで検証を遅らせる
function processData(data: any) {
  // データを使用してから問題が発覚する
  const result = someOperation(data.awsAccount);
  return result;
}

// ✅ 良い例: 早期に検証
function processData(data: unknown) {
  // 最初に検証
  const validData = validateEnvironmentProps(data);
  // 検証済みデータを使用
  const result = someOperation(validData.awsAccount);
  return result;
}
```

### 2. 型の再利用

```typescript
// スキーマから型を生成
import type { EnvironmentProps } from './lib/schemas';

// 関数のパラメータで使用
function deployStack(config: EnvironmentProps) {
  // configは完全に型付けされている
  console.log(config.awsRegion);
}
```

### 3. 段階的な検証

```typescript
// 基本検証
const basicValidation = environmentPropsSchema.safeParse(data);
if (!basicValidation.success) {
  return { errors: basicValidation.error.errors };
}

// ビジネスロジック検証
if (basicValidation.data.useTranscribe && !basicValidation.data.bucketName) {
  return { errors: ['Transcribeを使用する場合はバケット名が必要です'] };
}

// 全て成功
return { data: basicValidation.data };
```

### 4. エラーメッセージのカスタマイズ

```typescript
import { z } from 'zod';

// プロジェクト固有のエラーメッセージ
const customBucketNameSchema = z.string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/)
  .refine(
    (name) => !name.includes('..'),
    '連続するドットは使用できません'
  )
  .refine(
    (name) => name.includes('asr') || name.includes('transcribe'),
    'バケット名には "asr" または "transcribe" を含める必要があります'
  );
```

## まとめ

このZod実装により以下が実現されています：

1. ✅ **型安全性**: TypeScriptの型とランタイム検証の完全な一致
2. ✅ **早期エラー検出**: デプロイ前の設定ミスの検出
3. ✅ **明確なエラー**: 日本語での分かりやすいエラーメッセージ
4. ✅ **保守性**: スキーマがドキュメントとして機能
5. ✅ **テスト容易性**: 包括的なテストカバレッジ
6. ✅ **CDK統合**: スタック合成時の検証

詳細な実装例については、`test/`ディレクトリ内のテストファイルを参照してください。

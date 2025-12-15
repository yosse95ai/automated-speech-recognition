# CIDR検証実装アプローチ

## 概要

このドキュメントでは、automated-speech-recognition CDKプロジェクトにおけるVPCおよびサブネット構成のCIDR検証実装について説明します。

## 実装要件

### VPC CIDR検証
- プレフィックス長が /25 より大きいCIDRブロックを拒否
- 例: /26、/27、/28 などは検証エラーとなる
- 適用対象: `apiVpcCidr` および `onpremiseCidr`

### サブネット CIDR検証
- プレフィックス長が /27 より大きいCIDRマスクを拒否
- 例: /28、/29、/30 などは検証エラーとなる
- 適用対象: VPC構成内のサブネットCIDRマスク設定

## 実装アプローチ

### 1. 検証の配置場所

#### スタックレベルの検証
**場所**: `lib/main-app-stack.ts`

**目的**: 
- 環境設定の早期検証
- CDK合成時にエラーを検出
- アプリケーション全体の設定整合性を保証

**実装方法**:
```typescript
this.node.addValidation(new EnvironmentValidator({
  apiVpcCidr: props.apiVpcCidr,
  onpremiseCidr: props.onpremiseCidr,
}));
```

**利点**:
- CDKの `synth` コマンド実行時に検証が行われる
- デプロイ前にエラーを発見できる
- 複数のリソース間の整合性チェックが可能

#### コンストラクトレベルの検証
**場所**: 
- `lib/constructor/api/vpc.ts`
- `lib/constructor/onprem/vpc.ts`

**目的**:
- リソース作成時の入力値検証
- 各VPCコンストラクトの独立性を保証
- 明確なエラーメッセージの提供

**実装方法**:
```typescript
// VPC CIDR検証
const vpcCidrValidation = validateVpcCidr(props.cidr, `${props.name} VPC`);
if (!vpcCidrValidation.isValid) {
  throw new Error(vpcCidrValidation.errorMessage);
}

// サブネット CIDR検証
const privateSubnetValidation = validateSubnetCidr(privateCidrMask, `${props.name} プライベートサブネット`);
if (!privateSubnetValidation.isValid) {
  throw new Error(privateSubnetValidation.errorMessage);
}
```

**利点**:
- コンストラクトの再利用性が高い
- 各リソースで独立した検証ロジック
- エラーの発生箇所が明確

### 2. 推奨される検証パターン

#### CDK IValidationインターフェースの使用

**ファイル**: `lib/validators/environment-validator.ts`

```typescript
export class EnvironmentValidator implements IValidation {
  validate(): string[] {
    const errors: string[] = [];
    
    // 検証ロジックを実装
    const apiVpcValidation = validateVpcCidr(this.props.apiVpcCidr, 'API VPC');
    if (!apiVpcValidation.isValid) {
      errors.push(apiVpcValidation.errorMessage!);
    }
    
    return errors;
  }
}
```

**特徴**:
- CDKの標準的な検証メカニズム
- 複数の検証エラーを収集可能
- `cdk synth` 時に自動実行

#### プロパティ検証（コンストラクタ内）

**実装場所**: VPCコンストラクトのコンストラクタ

```typescript
constructor(scope: Construct, id: string, props: VpcProps) {
  super(scope, id);
  
  // 検証失敗時は即座に例外をスロー
  const validation = validateVpcCidr(props.cidr, `${props.name} VPC`);
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }
  
  // リソース作成処理...
}
```

**特徴**:
- 即座にエラーを検出
- 無効な設定でのリソース作成を防止
- シンプルで理解しやすい

### 3. 検証コード構造例

#### ユーティリティモジュール
**ファイル**: `lib/utils/cidr-validation.ts`

```typescript
export interface CidrValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateVpcCidr(cidr: string, resourceName: string): CidrValidationResult {
  const prefixLength = extractPrefixLength(cidr);
  
  if (prefixLength === null) {
    return {
      isValid: false,
      errorMessage: `${resourceName}のCIDRブロック形式が不正です: ${cidr}`
    };
  }
  
  if (prefixLength > 25) {
    return {
      isValid: false,
      errorMessage: `${resourceName}のCIDRブロックのプレフィックス長が無効です: ${cidr}。` +
        `プレフィックス長は /25 以下である必要があります（現在: /${prefixLength}）。`
    };
  }
  
  return { isValid: true };
}

export function validateSubnetCidr(cidrMask: number, resourceName: string): CidrValidationResult {
  if (cidrMask > 27) {
    return {
      isValid: false,
      errorMessage: `${resourceName}のサブネットCIDRマスクが無効です: /${cidrMask}。` +
        `サブネットのプレフィックス長は /27 以下である必要があります。`
    };
  }
  
  return { isValid: true };
}
```

**設計の利点**:
- 再利用可能な検証ロジック
- 一貫したエラーメッセージ形式
- 日本語での明確なエラー説明
- 単体テストが容易

### 4. 異なる検証アプローチのトレードオフ

#### アプローチ1: スタックレベル検証のみ

**利点**:
- 集中管理された検証ロジック
- アプリケーション全体の整合性チェック
- CDK合成時の早期検出

**欠点**:
- コンストラクトの再利用性が低下
- エラー発生箇所が不明確になる可能性
- 個別のコンストラクトテストが困難

#### アプローチ2: コンストラクトレベル検証のみ

**利点**:
- コンストラクトの独立性が高い
- エラー発生箇所が明確
- 再利用性が高い

**欠点**:
- 複数リソース間の整合性チェックが困難
- 検証ロジックが分散する可能性
- 重複する検証コードが発生する可能性

#### アプローチ3: ハイブリッド（推奨）

**実装**: スタックレベル + コンストラクトレベルの両方

**利点**:
- 早期検証（スタックレベル）
- 防御的プログラミング（コンストラクトレベル）
- 高い再利用性と整合性の両立
- 明確なエラーメッセージ

**欠点**:
- 実装コードが増える
- 検証ロジックの重複がある

**推奨理由**:
このプロジェクトでは、ハイブリッドアプローチを採用しています。これにより：
1. CDK合成時に環境設定を検証（早期エラー検出）
2. コンストラクト作成時に入力値を検証（防御的プログラミング）
3. 各レベルで適切なエラーメッセージを提供
4. コンストラクトの再利用性を維持

#### アプローチ4: CDK Aspectsの使用

**概要**: CDK Aspectsは、CDKツリー全体を走査して検証を適用するパターン

**実装例**:
```typescript
class CidrValidationAspect implements IAspect {
  visit(node: IConstruct): void {
    if (node instanceof CfnVPC) {
      // VPCのCIDR検証
    }
  }
}

// アプリケーションレベルで適用
Aspects.of(app).add(new CidrValidationAspect());
```

**トレードオフ**:
- **利点**: 
  - 横断的な関心事に最適
  - 既存コードを変更せずに検証を追加可能
  - CDKツリー全体に適用可能

- **欠点**:
  - より複雑な実装
  - デバッグが困難
  - プロパティレベルの検証には不向き

**非採用理由**: 
このプロジェクトでは、プロパティレベルの検証が主な要件であり、Aspectsの複雑性は不要と判断しました。

## エラーメッセージの例

### VPC CIDR検証エラー
```
Api VPCのCIDRブロックのプレフィックス長が無効です: 10.0.0.0/26。
プレフィックス長は /25 以下である必要があります（現在: /26）。
/26、/27、/28 などのプレフィックスは使用できません。
```

### サブネット CIDR検証エラー
```
Api プライベートサブネットのサブネットCIDRマスクが無効です: /28。
サブネットのプレフィックス長は /27 以下である必要があります。
/28、/29、/30 などのプレフィックスは使用できません。
```

## テスト方法

### 検証が機能することを確認

1. **無効なVPC CIDRでテスト**:
```typescript
// bin/app.ts
apiVpcCidr: "10.0.0.0/28", // これは失敗するはず
```

2. **CDK合成を実行**:
```bash
cd packages/cdk
npm run build
npx cdk synth
```

3. **期待される結果**: エラーメッセージが表示され、合成が失敗する

### 単体テスト

```typescript
import { validateVpcCidr, validateSubnetCidr } from '../lib/utils/cidr-validation';

test('VPC CIDR validation rejects /26', () => {
  const result = validateVpcCidr('10.0.0.0/26', 'Test VPC');
  expect(result.isValid).toBe(false);
  expect(result.errorMessage).toContain('/25 以下');
});

test('VPC CIDR validation accepts /25', () => {
  const result = validateVpcCidr('10.0.0.0/25', 'Test VPC');
  expect(result.isValid).toBe(true);
});

test('Subnet CIDR validation rejects /28', () => {
  const result = validateSubnetCidr(28, 'Test Subnet');
  expect(result.isValid).toBe(false);
  expect(result.errorMessage).toContain('/27 以下');
});

test('Subnet CIDR validation accepts /27', () => {
  const result = validateSubnetCidr(27, 'Test Subnet');
  expect(result.isValid).toBe(true);
});
```

## 実装ファイルの一覧

1. **`lib/utils/cidr-validation.ts`** - CIDR検証ユーティリティ関数
2. **`lib/validators/environment-validator.ts`** - スタックレベル検証クラス
3. **`lib/constructor/api/vpc.ts`** - API VPCコンストラクト（検証追加済み）
4. **`lib/constructor/onprem/vpc.ts`** - Onprem VPCコンストラクト（検証追加済み）
5. **`lib/main-app-stack.ts`** - メインスタック（検証統合済み）

## 参考資料

- [AWS CDK Validation Documentation](https://docs.aws.amazon.com/cdk/v2/guide/validation.html)
- [AWS Builders Flash - CDK Validation](https://aws.amazon.com/jp/builders-flash/202406/cdk-validation/)
- [CDK IValidation Interface](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.IValidation.html)
- [CDK Aspects Pattern](https://docs.aws.amazon.com/cdk/v2/guide/aspects.html)

## まとめ

この実装では、以下の原則に従っています：

1. **防御的プログラミング**: 複数のレベルで検証を実施
2. **明確なエラーメッセージ**: 日本語で具体的な要件を説明
3. **再利用可能な設計**: ユーティリティ関数による共通ロジック
4. **CDKのベストプラクティス**: IValidationインターフェースの活用
5. **保守性**: 分離された検証ロジックで変更が容易

この多層的な検証アプローチにより、開発時からデプロイ時まで、一貫してCIDR設定の妥当性を保証します。

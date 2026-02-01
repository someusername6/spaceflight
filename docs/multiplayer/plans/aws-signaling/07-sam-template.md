# Phase 07: SAM Template

## Objective

Create the complete AWS SAM template for infrastructure as code deployment.

## Prerequisites

- All previous phases complete (all code exists)

## Files to Create

```
server/signaling-aws/
└── infra/
    └── template.yaml
```

## Tasks

### 1. Create infra/template.yaml

The template defines all AWS resources:

**Resources:**

| Resource | Type | Purpose |
|----------|------|---------|
| SignalingTable | DynamoDB::Table | Single-table for all signaling data |
| SignalingFunction | Serverless::Function | Main signaling Lambda |
| SignalingFunctionUrl | (auto-created) | HTTPS endpoint |
| SignalingLogGroup | Logs::LogGroup | Logs with 7-day retention |
| DisableFunction | Serverless::Function | Auto-disable Lambda |
| DisableLogGroup | Logs::LogGroup | Logs with 30-day retention |
| DisableDLQ | SQS::Queue | Dead letter queue for failures |
| InvocationAlarm | CloudWatch::Alarm | Triggers at 30k/hour |
| DisableRule | Events::Rule | Connects alarm to disable Lambda |
| DisableFunctionPermission | Lambda::Permission | EventBridge → Lambda |
| DLQAlarm | CloudWatch::Alarm | Alerts on DLQ messages |

### 2. DynamoDB Table configuration

```yaml
SignalingTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: spaceflight-signaling
    BillingMode: PROVISIONED
    ProvisionedThroughput:
      ReadCapacityUnits: 25
      WriteCapacityUnits: 25
    AttributeDefinitions:
      - AttributeName: PK
        AttributeType: S
      - AttributeName: SK
        AttributeType: S
    KeySchema:
      - AttributeName: PK
        KeyType: HASH
      - AttributeName: SK
        KeyType: RANGE
    TimeToLiveSpecification:
      AttributeName: expiresAt
      Enabled: true
```

**Key points:**
- Provisioned mode = hard rate limit (free tier)
- 25 RCU/WCU = free tier maximum
- TTL enabled for automatic cleanup

### 3. Signaling Lambda configuration

```yaml
SignalingFunction:
  Type: AWS::Serverless::Function
  Metadata:
    BuildMethod: esbuild
    BuildProperties:
      Minify: true
      Target: es2022
      EntryPoints:
        - src/index.ts
  Properties:
    FunctionName: spaceflight-signaling
    Handler: index.handler
    Runtime: nodejs20.x
    Timeout: 30
    MemorySize: 256
    ReservedConcurrentExecutions: 50
    FunctionUrlConfig:
      AuthType: NONE
      Cors:
        AllowOrigins:
          - !Ref AllowedOrigin
        AllowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS']
        AllowHeaders: ['Content-Type', 'Authorization']
    Environment:
      Variables:
        TABLE_NAME: !Ref SignalingTable
        # ... other config vars
```

**Key points:**
- esbuild for TypeScript bundling
- Function URL (free, no API Gateway)
- Reserved concurrency = 50 (DDoS protection)
- CORS configured via parameter

### 4. IAM Policies

**Signaling Lambda:**
```yaml
Policies:
  - Version: '2012-10-17'
    Statement:
      - Effect: Allow
        Action:
          - dynamodb:GetItem
          - dynamodb:PutItem
          - dynamodb:UpdateItem
          - dynamodb:DeleteItem
          - dynamodb:Query
          - dynamodb:TransactWriteItems
          - dynamodb:BatchWriteItem
        Resource:
          - !GetAtt SignalingTable.Arn
```

**Disable Lambda:**
```yaml
Policies:
  - Version: '2012-10-17'
    Statement:
      - Effect: Allow
        Action: lambda:PutFunctionConcurrency
        Resource: !GetAtt SignalingFunction.Arn
```

### 5. CloudWatch Alarm

```yaml
InvocationAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: spaceflight-signaling-invocation-limit
    MetricName: Invocations
    Namespace: AWS/Lambda
    Dimensions:
      - Name: FunctionName
        Value: spaceflight-signaling
    Statistic: Sum
    Period: 3600
    EvaluationPeriods: 1
    Threshold: 30000
    ComparisonOperator: GreaterThanThreshold
    TreatMissingData: notBreaching
```

### 6. EventBridge Rule

```yaml
DisableRule:
  Type: AWS::Events::Rule
  Properties:
    EventPattern:
      source:
        - aws.cloudwatch
      detail-type:
        - CloudWatch Alarm State Change
      detail:
        alarmName:
          - spaceflight-signaling-invocation-limit
        state:
          value:
            - ALARM
    Targets:
      - Id: DisableLambda
        Arn: !GetAtt DisableFunction.Arn
```

### 7. Parameters

```yaml
Parameters:
  AllowedOrigin:
    Type: String
    Description: CORS allowed origin (* for itch.io)
    Default: '*'
```

**CORS for itch.io:** Games on itch.io (https://sunlitgrove.itch.io/spaceflight) run in iframes served from `*.itch.zone` domains, not directly from `itch.io`. Since SAM Function URL only supports a single origin, use `*` for itch.io deployments.

### 8. Outputs

```yaml
Outputs:
  SignalingUrl:
    Description: Signaling server Function URL
    Value: !GetAtt SignalingFunctionUrl.FunctionUrl
  TableName:
    Description: DynamoDB table name
    Value: !Ref SignalingTable
```

## Validation

### SAM validation

```bash
cd server/signaling-aws
sam validate --lint
```

### Template review checklist

- [ ] All resources have correct types
- [ ] IAM policies follow least privilege
- [ ] Environment variables match config.ts expectations
- [ ] DynamoDB provisioned at free tier limits
- [ ] CloudWatch alarm threshold is 30,000
- [ ] EventBridge pattern matches alarm name
- [ ] Log retention set (7 days signaling, 30 days disable)
- [ ] DLQ configured for disable Lambda
- [ ] Function URLs have CORS configured

## Acceptance Criteria

- [ ] `sam validate` passes
- [ ] `sam build` succeeds
- [ ] All resources defined correctly
- [ ] IAM policies are least-privilege
- [ ] Environment variables configured

## Commit Message

```
Add SAM template for AWS signaling infrastructure

- DynamoDB table with TTL and provisioned capacity
- Lambda functions with esbuild bundling
- CloudWatch alarm at 30k invocations/hour
- EventBridge rule for auto-disable
- Dead letter queue for failure capture
- CORS via Function URL config
```

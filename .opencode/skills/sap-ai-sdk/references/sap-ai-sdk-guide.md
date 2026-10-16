# SAP AI SDK Guide

Authoritative guide for using SAP AI SDK in CAP projects. Two packages are used:

- **`@sap-ai-sdk/orchestration`** -- LLM chat completion (Claude, GPT, Gemini, etc.) via the harmonized orchestration API
- **`@sap-ai-sdk/rpt`** -- Tabular prediction via SAP RPT-1 Table Transformer

> **Important**: Do NOT use `@sap-ai-sdk/foundation-models` or `AzureOpenAiChatClient` -- those only work with Azure OpenAI (GPT) models. If your project uses Claude or other non-Azure models on AI Core, use the orchestration package.

## Setup

### Installation

```bash
npm install @sap-ai-sdk/orchestration @sap-ai-sdk/rpt
```

### AI Core Binding

For hybrid testing (real AI Core), bind credentials:

```bash
cds bind aicore --to <ai-core-service-instance-name>
```

This creates `.cdsrc-private.json` with credentials. See `skills/cap-development/references/development-runtime.md` → *Hybrid Testing* for details.

### AI Core Deployments

Each project should document its specific deployment IDs in `project-context.md` at the project root. The orchestration client needs an orchestration deployment; the RPT client needs an RPT-1 deployment.

## OrchestrationClient (LLM Chat)

The `OrchestrationClient` provides a **harmonized API** that works with any model deployed on SAP AI Core. You specify the model name in the config -- switching from Claude to GPT is just changing the string.

### Client Initialization

```javascript
import { OrchestrationClient } from '@sap-ai-sdk/orchestration';

// Example: Claude 4.6 Opus (replace with your project's default model)
const client = new OrchestrationClient({
  promptTemplating: {
    model: { name: 'anthropic--claude-4.6-opus' }
  }
});

// With model params
const client = new OrchestrationClient({
  promptTemplating: {
    model: {
      name: 'anthropic--claude-4.6-opus',
      params: { max_tokens: 4000, temperature: 0.0 }
    }
  }
});

// Switching models is just changing the name string
const client = new OrchestrationClient({
  promptTemplating: {
    model: { name: 'anthropic--claude-4.6-sonnet' }
  }
});
```

### Chat Completion

```javascript
const response = await client.chatCompletion({
  messages: [
    { role: 'system', content: 'You are a document analyst.' },
    { role: 'user', content: 'Analyze this document...' }
  ]
});

const content = response.getContent();
const tokenUsage = response.getTokenUsage();
const finishReason = response.getFinishReason();
```

### Structured Output (JSON)

For agents that need reliable JSON output, instruct the LLM via the system prompt and parse the response:

```javascript
const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string' },
    date: { type: 'string' },
    amount: { type: 'number' },
    description: { type: 'string' }
  },
  required: ['category', 'date', 'amount', 'description']
};

const client = new OrchestrationClient({
  promptTemplating: {
    model: {
      name: 'anthropic--claude-4.6-opus',
      params: { max_tokens: 2000, temperature: 0.0 }
    }
  }
});

const response = await client.chatCompletion({
  messages: [
    {
      role: 'system',
      content: `Extract structured data from the document. Respond with ONLY valid JSON matching this schema:\n${JSON.stringify(EXTRACTION_SCHEMA, null, 2)}`
    },
    { role: 'user', content: documentText }
  ]
});

const structuredData = JSON.parse(response.getContent());
```

### Vision (Image/Document Analysis)

The orchestration API supports file inputs for vision-capable models:

```javascript
const response = await client.chatCompletion({
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this document and extract key information.' },
        {
          type: 'file',
          file_data: {
            url: `data:image/png;base64,${base64Image}`
          }
        }
      ]
    }
  ]
});
```

### Streaming

For long-running responses:

```javascript
const stream = await client.chatCompletionStream({
  messages: [
    { role: 'user', content: 'Provide a detailed analysis...' }
  ]
});

for await (const chunk of stream.toContentStream()) {
  process.stdout.write(chunk);
}

const finishReason = stream.getFinishReason();
const tokenUsage = stream.getTokenUsage();
```

### Model Fallback

The orchestration client supports fallback chains -- if the primary model fails, it tries the next:

```javascript
const client = new OrchestrationClient([
  {
    promptTemplating: {
      model: { name: 'anthropic--claude-4.6-opus', timeout: 30 }
    }
  },
  {
    promptTemplating: {
      model: { name: 'anthropic--claude-4.6-sonnet' }
    }
  }
]);
```

## RptClient (Tabular Prediction)

The `RptClient` from `@sap-ai-sdk/rpt` sends structured tabular data to SAP RPT-1 for classification or regression predictions.

### Client Initialization

```javascript
import { RptClient } from '@sap-ai-sdk/rpt';

const client = new RptClient('sap-rpt-1-large');
// or: new RptClient('sap-rpt-1-small') for faster, less accurate predictions
```

### Predict With Schema (Preferred)

```javascript
const schema = [
  { name: 'CATEGORY', dtype: 'string' },
  { name: 'AMOUNT', dtype: 'numeric' },
  { name: 'DATE', dtype: 'date' },
  { name: 'DESCRIPTION_LENGTH', dtype: 'numeric' },
  { name: 'HAS_ATTACHMENTS', dtype: 'string' },
  { name: 'TARGET', dtype: 'string' }
];

const prediction = await client.predictWithSchema(schema, {
  prediction_config: {
    target_columns: [{
      name: 'TARGET',
      prediction_placeholder: '[PREDICT]',
      task_type: 'classification'
    }]
  },
  index_column: 'ROW_ID',
  rows: [
    {
      ROW_ID: entityId,
      CATEGORY: structuredData.category,
      AMOUNT: structuredData.amount,
      DATE: structuredData.date,
      DESCRIPTION_LENGTH: structuredData.description.length,
      HAS_ATTACHMENTS: hasAttachments ? 'yes' : 'no',
      TARGET: '[PREDICT]'
    },
    // Include historical training rows for context
    ...trainingRows
  ]
});
```

The response contains prediction results mapped back to the input rows via the `index_column`.

### Key RPT-1 Concepts

- **`target_columns`**: columns to predict -- use `prediction_placeholder: '[PREDICT]'` in the input rows
- **`task_type`**: `'classification'` (categorical) or `'regression'` (numeric)
- **`index_column`**: unique identifier to map predictions back to input rows
- **Training rows**: include confirmed historical data alongside the prediction row for few-shot context
- RPT-1 is currently **beta** -- API may change

## Resilience

Always add resilience for production. Works with both `OrchestrationClient` and `RptClient`:

```javascript
import { resilience } from '@sap-cloud-sdk/resilience';

// OrchestrationClient
const response = await client.chatCompletion(
  { messages },
  { middleware: resilience({ timeout: 30000, circuitBreaker: true, retry: 3 }) }
);

// RptClient
const prediction = await rptClient.predictWithSchema(schema, data, {
  middleware: resilience({ timeout: 30000, circuitBreaker: true, retry: 3 })
});
```

## Error Handling + Airplane Mode

Every AI call must follow the try/catch stub fallback pattern for airplane mode:

```javascript
// srv/code/document-service/on-processDocument.js
import cds from '@sap/cds';
import { OrchestrationClient } from '@sap-ai-sdk/orchestration';
const LOGGER = cds.log('on-processDocument');

export default async function processDocument(msg, srv) {
  const prompt = `Extract the invoice data from document ${msg.data.ID}`;
  let result;

  try {
    const client = new OrchestrationClient({
      promptTemplating: { model: { name: 'anthropic--claude-4.6-opus' } }
    });
    const response = await client.chatCompletion({
      messages: [{ role: 'user', content: prompt }]
    });
    result = JSON.parse(response.getContent());
  } catch (error) {
    LOGGER.warn('AI call failed, using stub', { reason: error.message });
    result = { /* deterministic stub matching real schema */ };
  }

  return result;
}
```

See **Service Mocking & Airplane Mode** in `skills/cap-development/references/coding-standards.md` for the full pattern.

## Rules

- **Always** use `@sap-ai-sdk/orchestration` (`OrchestrationClient`) for LLM calls -- never `@sap-ai-sdk/foundation-models` or generic OpenAI/Anthropic SDKs
- **Always** use `@sap-ai-sdk/rpt` (`RptClient`) for tabular predictions -- never custom REST calls
- **Structured output**: instruct the LLM via system prompt to return JSON matching a schema, then parse with `JSON.parse()`
- **Low temperature** (0.0) for data extraction, moderate (0.3) for evaluation/reasoning
- **Log** token usage via `response.getTokenUsage()` for cost monitoring
- **Resilience** middleware for production deployments
- AI logic lives in `srv/code/` like all other implementation code
- Document your project's default models and deployment IDs in `project-context.md` at the project root

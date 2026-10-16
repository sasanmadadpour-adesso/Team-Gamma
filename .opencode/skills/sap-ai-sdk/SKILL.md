---
name: sap-ai-sdk
description: >-
  Integrates LLMs and SAP AI Core predictions through the SAP AI SDK
  (OrchestrationClient for LLM, RptClient for predictions). TRIGGER when:
  user mentions LLM, GPT, GPT-4, GPT-5, Claude, Anthropic, OpenAI,
  Gemini, orchestration, chat completion, prompt, system prompt,
  tool call, function calling, vision, image input, structured output,
  JSON schema response, embeddings, RPT-1, prediction, inference,
  @sap-ai-sdk/orchestration, @sap-ai-sdk/rpt, @sap-ai-sdk/foundation-
  models, @sap-ai-sdk/langchain, SAP AI Core, Generative AI Hub,
  ai-core, aicore, OrchestrationClient, RptClient, AI agent;
  editing a file that calls a model or defines a prompt template.
  SKIP: for direct openai / @anthropic-ai/sdk / langchain calls that
  bypass SAP AI SDK (forbidden — redirect here) and for prompt-template
  documentation work that does not involve calling a model.
---

# SAP AI SDK Integration

## Reference Material

For detailed guidance, read `references/sap-ai-sdk-guide.md` in this skill directory.

## Standards

Read `references/sap-ai-sdk-guide.md` for all AI SDK patterns including:
- `OrchestrationClient` from `@sap-ai-sdk/orchestration` for LLM chat (Claude, GPT, etc.)
- `RptClient` from `@sap-ai-sdk/rpt` for tabular predictions (RPT-1)
- Chat completion, structured output, vision, streaming
- Resilience (circuit breaker, timeout, retry)
- Error handling + airplane mode stub pattern

## Quick Reference: LLM (via Orchestration)

```javascript
import { OrchestrationClient } from '@sap-ai-sdk/orchestration';

const client = new OrchestrationClient({
  promptTemplating: { model: { name: 'anthropic--claude-4.6-opus' } }
});

const response = await client.chatCompletion({
  messages: [
    { role: 'system', content: 'You are a document analyst.' },
    { role: 'user', content: prompt }
  ]
});

const content = response.getContent();
const tokenUsage = response.getTokenUsage();
```

## Quick Reference: Predictions (RPT-1)

```javascript
import { RptClient } from '@sap-ai-sdk/rpt';

const client = new RptClient('sap-rpt-1-large');
const prediction = await client.predictWithSchema(schema, {
  prediction_config: {
    target_columns: [{ name: 'TARGET', prediction_placeholder: '[PREDICT]', task_type: 'classification' }]
  },
  index_column: 'ID',
  rows: [{ ID: '1', AMOUNT: 5000, TYPE: 'auto', TARGET: '[PREDICT]' }, ...trainingRows]
});
```

## Rules

- **Always** use `@sap-ai-sdk/orchestration` (`OrchestrationClient`) for LLM calls
- **Always** use `@sap-ai-sdk/rpt` (`RptClient`) for tabular predictions
- For embeddings use `OrchestrationEmbeddingClient` from `@sap-ai-sdk/orchestration` — same package, same rule
- **Never** use `@sap-ai-sdk/foundation-models`, `AzureOpenAiChatClient`, or generic OpenAI/Anthropic SDKs
- AI logic files live in `srv/code/<service-name>/` following the standard naming pattern; ESM `import` syntax (see `coding-standards.md` → *Module System*)
- Use structured output (instruct LLM via system prompt to return JSON) for data extraction
- Add resilience middleware for production
- Document your project's default models and deployment IDs in `project-context.md` at the project root

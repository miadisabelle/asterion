-- Asterion reference data
-- The layer taxonomy the /layers surface and layer-scoped queries depend on.
-- Idempotent: safe to replay against an already-provisioned database.

INSERT INTO asterion.layers (id, name, layer_type, description, sort_order, metadata) VALUES
  ('2e7ffa20-7cd6-488e-a06c-81028ec1a691', 'Runtime', 'runtime', 'Execution engine, orchestration, agent coordination', 1, '{}'::jsonb),
  ('3cb8a48e-adc4-4fae-bb81-bd38724dbed7', 'Memory', 'memory', 'Knowledge graph, persistent state, shared context', 2, '{}'::jsonb),
  ('bbca38c2-1407-4765-9853-f1f0b6e90b0e', 'Governance', 'governance', 'Policies, accountability, review processes', 3, '{}'::jsonb),
  ('a307b3e2-ef67-404e-a523-2d129e22ba51', 'PDE', 'pde', 'Prompt Decomposition Engine - structured decomposition of prompts into intents, directions, and action stacks', 4, '{}'::jsonb),
  ('c51db64c-9553-45ab-bb6f-77f9929c7fc8', 'Docs', 'docs', 'Documentation, specifications, narratives', 5, '{}'::jsonb),
  ('8ea32f85-8767-4f3e-971b-88ed871c365d', 'Security', 'security', 'Access control, audit, compliance', 6, '{}'::jsonb),
  ('382e924d-63cb-42cf-8383-f2428c69f133', 'Operator', 'operator', 'User-facing surfaces, dashboards, APIs', 7, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

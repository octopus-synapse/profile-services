import type { OpenAPIObject } from '@nestjs/swagger';

const API_RESPONSE_REF = '#/components/schemas/ApiResponseDto';

type JsonObject = Record<string, unknown>;

export function unwrapClientSpec(spec: OpenAPIObject): OpenAPIObject {
  const cloned = JSON.parse(JSON.stringify(spec)) as OpenAPIObject;

  if (cloned.paths) {
    for (const pathItem of Object.values(cloned.paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue;

      for (const operation of Object.values(pathItem as JsonObject)) {
        if (!operation || typeof operation !== 'object') continue;

        const op = operation as JsonObject;
        const responses = op.responses as JsonObject | undefined;
        if (!responses) continue;

        const codes = Object.keys(responses);
        const has2xx = codes.some((code) => code.startsWith('2'));

        if (has2xx) {
          for (const code of codes) {
            if (!code.startsWith('2')) {
              delete responses[code];
            }
          }
        }

        for (const response of Object.values(responses)) {
          if (!response || typeof response !== 'object') continue;
          const resp = response as JsonObject;
          const content = resp.content as JsonObject | undefined;
          if (!content) continue;

          const jsonContent = content['application/json'] as JsonObject | undefined;
          if (!jsonContent?.schema) continue;

          const unwrapped = unwrapDataSchema(jsonContent.schema as JsonObject);
          if (unwrapped) {
            jsonContent.schema = unwrapped;
          }
        }
      }
    }
  }

  if (cloned.components?.schemas) {
    delete (cloned.components.schemas as JsonObject).ApiResponseDto;
  }

  return cloned;
}

function unwrapDataSchema(schema: JsonObject): JsonObject | null {
  const allOf = schema.allOf as JsonObject[] | undefined;
  if (!allOf || allOf.length !== 2) return null;

  const [wrapper, payload] = allOf;
  if (wrapper?.$ref !== API_RESPONSE_REF) return null;

  const properties = payload?.properties as JsonObject | undefined;
  if (!properties?.data) return null;

  return properties.data as JsonObject;
}

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import type { ConfigPort } from '@/shared-kernel/config/config.port';
import type { Lifecycle } from '@/shared-kernel/lifecycle';
import type { LoggerPort } from '@/shared-kernel/logger/logger.port';

export async function initOpenTelemetry(
  config: ConfigPort,
  logger: LoggerPort,
): Promise<Lifecycle | undefined> {
  const enabled =
    config.env.DD_OBSERVABILITY_ENABLED === true && config.env.DD_OTEL_ENABLED === true;
  if (!enabled) return undefined;

  try {
    const serviceName = config.env.DD_SERVICE ?? 'profile-services';
    const env = config.env.DD_ENV ?? config.env.NODE_ENV;
    const version = config.env.DD_VERSION ?? config.env.APP_VERSION ?? 'unknown';
    const url =
      config.env.DD_OTLP_TRACES_URL ??
      `http://${config.env.DD_AGENT_HOST ?? '127.0.0.1'}:4318/v1/traces`;
    const exporter = new OTLPTraceExporter({ url });
    const provider = new NodeTracerProvider({
      resource: resourceFromAttributes({
        'service.name': serviceName,
        'service.version': version,
        'deployment.environment.name': env,
      }),
      spanProcessors: [new BatchSpanProcessor(exporter)],
    });

    provider.register();
    logger.log(`OpenTelemetry trace export enabled (${url})`, 'OpenTelemetry');
    return {
      dispose: async () => {
        await provider.shutdown();
      },
    };
  } catch (err) {
    logger.warn('OpenTelemetry initialization failed', 'OpenTelemetry', {
      reason: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

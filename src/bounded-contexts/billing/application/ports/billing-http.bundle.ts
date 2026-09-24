import type { PaymentProviderPort } from '../../domain/ports/payment-provider.port';
import type { ManageBillingAccessUseCase } from '../use-cases/access/manage-billing-access.use-case';
import type { ManageCheckoutUseCase } from '../use-cases/checkout/manage-checkout.use-case';
import type { ProcessProviderEventUseCase } from '../use-cases/provider/process-provider-event.use-case';
import type { GetBillingStatusUseCase } from '../use-cases/status/get-billing-status.use-case';
import type { ManageSubscriptionUseCase } from '../use-cases/subscription/manage-subscription.use-case';

export interface BillingHttpBundle {
  readonly access: ManageBillingAccessUseCase;
  readonly status: GetBillingStatusUseCase;
  readonly checkout: ManageCheckoutUseCase;
  readonly subscription: ManageSubscriptionUseCase;
  readonly provider: PaymentProviderPort | null;
  readonly processProvider: ProcessProviderEventUseCase | null;
  readonly enabled: boolean;
}

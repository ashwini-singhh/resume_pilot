import os
import stripe
from typing import Dict, Any, Optional

class PaymentService:
    def __init__(self):
        self.api_key = os.getenv("STRIPE_SECRET_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        stripe.api_key = self.api_key

    def create_checkout_session(self, user_id: str, amount: int, currency: str = "inr", success_url: str = "", cancel_url: str = "") -> Dict[str, Any]:
        """Create a Stripe Checkout Session."""
        if not self.api_key:
            raise ValueError("Stripe secret key not configured")
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': {
                        'name': 'ResumePilot Premium AI Credits (Unlimited)',
                        'description': 'Unlock unlimited resume analyses, bullet improvements, and JD optimizations.',
                    },
                    'unit_amount': amount * 100,  # convert to subunits (paise for INR, cents for USD)
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': user_id
            }
        )
        return {"id": session.id, "url": session.url}

    def construct_webhook_event(self, payload: str, sig_header: str) -> Optional[Dict[str, Any]]:
        """Verify and construct a Stripe Webhook event."""
        if not self.webhook_secret:
            raise ValueError("Stripe webhook secret not configured")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            return event
        except ValueError as e:
            # Invalid payload
            raise e
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            raise e

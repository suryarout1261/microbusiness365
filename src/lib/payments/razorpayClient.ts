declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  userEmail?: string;
  userPhone?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onError: (error: any) => void;
}

export async function openRazorpayCheckout(opts: RazorpayCheckoutOptions): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    opts.onError(new Error('Razorpay SDK could not be loaded. Please check your internet connection.'));
    return;
  }

  const options = {
    key: opts.keyId,
    amount: opts.amount,
    currency: opts.currency || 'INR',
    name: opts.name || 'MicroBusiness365',
    description: opts.description,
    image: '/favicon.svg',
    order_id: opts.orderId,
    handler: function (response: any) {
      opts.onSuccess({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      });
    },
    prefill: {
      email: opts.userEmail || '',
      contact: opts.userPhone || '',
    },
    theme: {
      color: '#4f46e5', // Indigo-600 matching design system
    },
    modal: {
      ondismiss: function () {
        console.log('Razorpay checkout modal closed by user');
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response: any) {
    opts.onError(response.error);
  });
  rzp.open();
}

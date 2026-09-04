<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = route.params.id as string;

const { data: invoice, refresh } = await useFetch(`/api/accounting/invoices/${id}`);

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-blue-100 text-blue-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-gray-100 text-gray-500',
};

const isActioning = ref(false);

// Payment modal
const isPaymentModalOpen = ref(false);
const paymentForm = reactive({
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  method: 'bankTransfer',
  reference: '',
});

function formatAmount(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

const inv = computed(() => invoice.value as any);

const subtotal = computed(() =>
  inv.value?.lines?.reduce((s: number, l: any) => s + (l.quantity * l.unitPrice), 0) || 0
);

const taxTotal = computed(() =>
  inv.value?.lines?.reduce((s: number, l: any) => s + (l.taxAmount || 0), 0) || 0
);

const totalAmount = computed(() => inv.value?.totalAmount || 0);
const amountPaid = computed(() => inv.value?.amountPaid || 0);
const balanceDue = computed(() => Math.round((totalAmount.value - amountPaid.value) * 100) / 100);

async function sendInvoice() {
  isActioning.value = true;
  try {
    await $fetch(`/api/accounting/invoices/${id}/send`, { method: 'POST' });
    toast.success('Invoice sent');
    await refresh();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to send invoice');
  } finally {
    isActioning.value = false;
  }
}

function openPaymentModal() {
  paymentForm.amount = balanceDue.value;
  paymentForm.date = new Date().toISOString().split('T')[0];
  paymentForm.method = 'bankTransfer';
  paymentForm.reference = '';
  isPaymentModalOpen.value = true;
}

async function recordPayment() {
  if (paymentForm.amount <= 0) {
    toast.error('Validation', 'Payment amount must be greater than zero');
    return;
  }
  isActioning.value = true;
  try {
    await $fetch(`/api/accounting/invoices/${id}/payments`, {
      method: 'POST',
      body: {
        amount: paymentForm.amount,
        date: paymentForm.date,
        method: paymentForm.method,
        reference: paymentForm.reference || null,
      },
    });
    toast.success('Payment recorded');
    isPaymentModalOpen.value = false;
    await refresh();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to record payment');
  } finally {
    isActioning.value = false;
  }
}

async function voidInvoice() {
  if (!confirm('Are you sure you want to void this invoice? This action cannot be undone.')) return;
  isActioning.value = true;
  try {
    await $fetch(`/api/accounting/invoices/${id}/void`, { method: 'POST' });
    toast.success('Invoice voided');
    await refresh();
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to void invoice');
  } finally {
    isActioning.value = false;
  }
}
</script>

<template>
  <div class="space-y-6" v-if="inv">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 pb-4">
      <div class="flex items-center gap-4">
        <NuxtLink to="/accounting/invoices" class="text-gray-400 hover:text-gray-600">
          <Icon name="lucide:arrow-left" class="h-5 w-5" />
        </NuxtLink>
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900">{{ inv.invoiceNumber }}</h1>
            <span class="text-xs px-2 py-0.5 rounded-full" :class="statusColors[inv.status]">
              {{ inv.status }}
            </span>
          </div>
          <p class="mt-1 text-sm text-gray-500">{{ inv.customer?.name || 'No customer' }}</p>
        </div>
      </div>
      <div class="flex gap-3">
        <UiButton v-if="inv.status === 'draft'" variant="primary" :loading="isActioning" @click="sendInvoice">
          <Icon name="lucide:send" class="mr-2 h-4 w-4" />
          Send Invoice
        </UiButton>
        <UiButton v-if="inv.status === 'sent' || inv.status === 'partial'" variant="primary" :loading="isActioning" @click="openPaymentModal">
          <Icon name="lucide:credit-card" class="mr-2 h-4 w-4" />
          Record Payment
        </UiButton>
        <UiButton v-if="inv.status !== 'void'" variant="destructive" :loading="isActioning" @click="voidInvoice">
          <Icon name="lucide:ban" class="mr-2 h-4 w-4" />
          Void
        </UiButton>
      </div>
    </div>

    <!-- Invoice Details -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="text-xs text-gray-500">Issue Date</p>
        <p class="text-sm font-medium text-gray-900 mt-1">{{ formatDate(inv.issueDate) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="text-xs text-gray-500">Due Date</p>
        <p class="text-sm font-medium text-gray-900 mt-1">{{ formatDate(inv.dueDate) }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="text-xs text-gray-500">Currency</p>
        <p class="text-sm font-medium text-gray-900 mt-1">{{ inv.currency || 'GHS' }}</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <p class="text-xs text-gray-500">Terms</p>
        <p class="text-sm font-medium text-gray-900 mt-1">{{ inv.terms || '-' }}</p>
      </div>
    </div>

    <!-- Line Items Table -->
    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
        <h2 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Line Items</h2>
      </div>
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-100">
            <th class="px-6 py-2 text-left text-xs font-medium text-gray-500">Description</th>
            <th class="px-6 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
            <th class="px-6 py-2 text-right text-xs font-medium text-gray-500">Unit Price</th>
            <th class="px-6 py-2 text-right text-xs font-medium text-gray-500">Tax</th>
            <th class="px-6 py-2 text-right text-xs font-medium text-gray-500">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="line in inv.lines" :key="line.id">
            <td class="px-6 py-3">
              <span class="text-sm font-medium text-gray-900">{{ line.description }}</span>
              <p v-if="line.product?.name" class="text-xs text-gray-400">{{ line.product.name }}</p>
            </td>
            <td class="px-6 py-3 text-sm text-right text-gray-900">{{ line.quantity }}</td>
            <td class="px-6 py-3 text-sm text-right text-gray-900">{{ formatAmount(line.unitPrice) }}</td>
            <td class="px-6 py-3 text-sm text-right text-gray-500">{{ formatAmount(line.taxAmount || 0) }}</td>
            <td class="px-6 py-3 text-sm text-right font-medium text-gray-900">{{ formatAmount(line.lineTotal || line.quantity * line.unitPrice + (line.taxAmount || 0)) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="rounded-xl border border-gray-200 bg-white p-6">
      <div class="flex justify-end">
        <div class="w-72 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Subtotal</span>
            <span class="font-medium text-gray-900">GHS {{ formatAmount(subtotal) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Tax</span>
            <span class="font-medium text-gray-900">GHS {{ formatAmount(taxTotal) }}</span>
          </div>
          <div class="flex justify-between text-sm border-t border-gray-200 pt-2">
            <span class="font-semibold text-gray-900">Total</span>
            <span class="font-bold text-gray-900">GHS {{ formatAmount(totalAmount) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-green-600">Amount Paid</span>
            <span class="font-medium text-green-600">GHS {{ formatAmount(amountPaid) }}</span>
          </div>
          <div class="flex justify-between text-sm border-t border-gray-200 pt-2">
            <span class="font-bold text-gray-900">Balance Due</span>
            <span class="font-bold" :class="balanceDue > 0 ? 'text-red-600' : 'text-green-600'">
              GHS {{ formatAmount(balanceDue) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Payments List -->
    <div v-if="inv.payments && inv.payments.length > 0" class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="border-b border-gray-100 bg-gray-50/50 px-6 py-3">
        <h2 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Payments</h2>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="payment in inv.payments" :key="payment.id" class="flex items-center justify-between px-6 py-3">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
              <Icon name="lucide:check-circle" class="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">GHS {{ formatAmount(payment.amount) }}</p>
              <p class="text-xs text-gray-400">{{ formatDate(payment.date) }} &middot; {{ payment.method }}</p>
            </div>
          </div>
          <span v-if="payment.reference" class="text-xs text-gray-400">Ref: {{ payment.reference }}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="inv.notes" class="rounded-xl border border-gray-200 bg-white p-6">
      <h3 class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Notes</h3>
      <p class="text-sm text-gray-600">{{ inv.notes }}</p>
    </div>

    <!-- Payment Modal -->
    <UiModal v-model:open="isPaymentModalOpen" title="Record Payment" size="md">
      <form id="payment-form" class="space-y-4" @submit.prevent="recordPayment">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Amount <span class="text-red-500">*</span></label>
          <UiInput v-model.number="paymentForm.amount" type="number" step="0.01" min="0" placeholder="0.00" />
        </div>
        <UiInput v-model="paymentForm.date" label="Date" type="date" />
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
          <select v-model="paymentForm.method" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="cash">Cash</option>
            <option value="bankTransfer">Bank Transfer</option>
            <option value="mobileMoney">Mobile Money</option>
            <option value="check">Check</option>
            <option value="other">Other</option>
          </select>
        </div>
        <UiInput v-model="paymentForm.reference" label="Reference" placeholder="e.g. Transaction ID" />
      </form>
      <template #footer>
        <UiButton variant="secondary" @click="isPaymentModalOpen = false">Cancel</UiButton>
        <UiButton type="submit" form="payment-form" :loading="isActioning" @click="recordPayment">
          Record Payment
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>

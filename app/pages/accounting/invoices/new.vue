<script setup lang="ts">
const router = useRouter();
const toast = useToast();

const { data: customers } = await useFetch('/api/accounting/customers');
const { data: products } = await useFetch('/api/products');
const { data: taxes } = await useFetch('/api/taxes');

const form = reactive({
  customerId: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  notes: '',
  terms: '',
  currency: 'GHS',
});

interface InvoiceLine {
  description: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  taxId: string;
  taxAmount: number;
  lineTotal: number;
}

const lines = ref<InvoiceLine[]>([
  { description: '', productId: '', quantity: 1, unitPrice: 0, taxId: '', taxAmount: 0, lineTotal: 0 },
]);

function addLine() {
  lines.value.push({ description: '', productId: '', quantity: 1, unitPrice: 0, taxId: '', taxAmount: 0, lineTotal: 0 });
}

function removeLine(index: number) {
  if (lines.value.length <= 1) return;
  lines.value.splice(index, 1);
}

function onProductChange(line: InvoiceLine) {
  if (!line.productId) return;
  const product = (products.value as any[])?.find((p) => p.id === line.productId);
  if (product) {
    line.description = product.name;
    line.unitPrice = product.sellingPrice || product.price || 0;
    recalcLine(line);
  }
}

function getTaxRate(taxId: string): number {
  if (!taxId) return 0;
  const tax = (taxes.value as any[])?.find((t) => t.id === taxId);
  return tax ? tax.rate : 0;
}

function recalcLine(line: InvoiceLine) {
  const rate = getTaxRate(line.taxId);
  line.taxAmount = Math.round(line.quantity * line.unitPrice * rate * 100) / 100;
  line.lineTotal = Math.round((line.quantity * line.unitPrice + line.taxAmount) * 100) / 100;
}

// Watch all lines for changes
watch(lines, () => {
  lines.value.forEach((line) => recalcLine(line));
}, { deep: true });

const subtotal = computed(() =>
  Math.round(lines.value.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100
);

const taxTotal = computed(() =>
  Math.round(lines.value.reduce((s, l) => s + l.taxAmount, 0) * 100) / 100
);

const grandTotal = computed(() =>
  Math.round((subtotal.value + taxTotal.value) * 100) / 100
);

function formatAmount(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const isSubmitting = ref(false);

async function save(sendAfter: boolean) {
  if (!form.customerId) {
    toast.error('Validation', 'Please select a customer');
    return;
  }
  if (!form.issueDate) {
    toast.error('Validation', 'Issue date is required');
    return;
  }
  const validLines = lines.value.filter((l) => l.description.trim() && l.quantity > 0 && l.unitPrice > 0);
  if (validLines.length === 0) {
    toast.error('Validation', 'At least one line item with description, quantity, and price is required');
    return;
  }

  isSubmitting.value = true;
  try {
    const result = await $fetch('/api/accounting/invoices', {
      method: 'POST',
      body: {
        customerId: form.customerId,
        issueDate: form.issueDate,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
        terms: form.terms || null,
        currency: form.currency,
        status: 'draft',
        lines: validLines.map((l) => ({
          description: l.description,
          productId: l.productId || null,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          taxId: l.taxId || null,
          taxAmount: l.taxAmount,
          lineTotal: l.quantity * l.unitPrice + l.taxAmount,
        })),
      },
    });

    const invoiceId = (result as any).id;

    if (sendAfter) {
      try {
        await $fetch(`/api/accounting/invoices/${invoiceId}/send`, { method: 'POST' });
        toast.success('Invoice created and sent');
      } catch {
        toast.warning('Invoice saved as draft', 'Failed to send, but the invoice was saved');
      }
    } else {
      toast.success('Invoice saved as draft');
    }

    router.push(`/accounting/invoices/${invoiceId}`);
  } catch (e: any) {
    toast.error('Error', e.data?.message || 'Failed to create invoice');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-4 border-b border-gray-200 pb-4">
      <NuxtLink to="/accounting/invoices" class="text-gray-400 hover:text-gray-600">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">New Invoice</h1>
        <p class="mt-1 text-sm text-gray-500">Create a new customer invoice</p>
      </div>
    </div>

    <!-- Header Fields -->
    <div class="rounded-xl border border-gray-200 bg-white p-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Customer <span class="text-red-500">*</span></label>
          <select v-model="form.customerId" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
            <option value="">Select customer...</option>
            <option v-for="c in (customers as any[])" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <UiInput v-model="form.issueDate" label="Issue Date" type="date" />
        <UiInput v-model="form.dueDate" label="Due Date" type="date" />
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <UiInput v-model="form.currency" label="Currency" placeholder="GHS" />
        <UiInput v-model="form.terms" label="Terms" placeholder="e.g. Net 30" />
        <UiInput v-model="form.notes" label="Notes" placeholder="Optional notes" />
      </div>
    </div>

    <!-- Line Items -->
    <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div class="border-b border-gray-100 bg-gray-50/50 px-6 py-3 flex items-center justify-between">
        <h2 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Line Items</h2>
        <button @click="addLine" class="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Add Line
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-100">
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 w-[25%]">Description</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 w-[20%]">Product</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 w-20">Qty</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 w-28">Unit Price</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 w-[15%]">Tax</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 w-24">Tax Amt</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 w-28">Line Total</th>
              <th class="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="(line, i) in lines" :key="i">
              <td class="px-4 py-2">
                <input v-model="line.description" type="text" placeholder="Item description" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" />
              </td>
              <td class="px-4 py-2">
                <select v-model="line.productId" @change="onProductChange(line)" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">None</option>
                  <option v-for="p in (products as any[])" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </td>
              <td class="px-4 py-2">
                <input v-model.number="line.quantity" type="number" min="1" step="1" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right" />
              </td>
              <td class="px-4 py-2">
                <input v-model.number="line.unitPrice" type="number" min="0" step="0.01" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm text-right" />
              </td>
              <td class="px-4 py-2">
                <select v-model="line.taxId" @change="recalcLine(line)" class="w-full rounded border border-gray-300 px-2 py-1.5 text-sm">
                  <option value="">No tax</option>
                  <option v-for="t in (taxes as any[])" :key="t.id" :value="t.id">
                    {{ t.name }} ({{ (t.rate * 100).toFixed(1) }}%)
                  </option>
                </select>
              </td>
              <td class="px-4 py-2 text-right text-sm text-gray-500">
                {{ formatAmount(line.taxAmount) }}
              </td>
              <td class="px-4 py-2 text-right text-sm font-medium text-gray-900">
                {{ formatAmount(line.quantity * line.unitPrice + line.taxAmount) }}
              </td>
              <td class="px-4 py-2">
                <button v-if="lines.length > 1" @click="removeLine(i)" class="text-gray-400 hover:text-red-500">
                  <Icon name="lucide:x" class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals & Actions -->
      <div class="border-t border-gray-200 px-6 py-4">
        <div class="flex justify-end">
          <div class="w-64 space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Subtotal</span>
              <span class="font-medium text-gray-900">GHS {{ formatAmount(subtotal) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Tax</span>
              <span class="font-medium text-gray-900">GHS {{ formatAmount(taxTotal) }}</span>
            </div>
            <div class="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span class="font-semibold text-gray-900">Grand Total</span>
              <span class="font-bold text-gray-900">GHS {{ formatAmount(grandTotal) }}</span>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <UiButton variant="secondary" :loading="isSubmitting" @click="save(false)">
            Save as Draft
          </UiButton>
          <UiButton :loading="isSubmitting" @click="save(true)">
            <Icon name="lucide:send" class="mr-2 h-4 w-4" />
            Save &amp; Send
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>

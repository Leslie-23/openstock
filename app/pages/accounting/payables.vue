<script setup lang="ts">
const toast = useToast();
const { data: apData, refresh } = await useFetch('/api/accounting/payables');

function fmt(n: number) {
  return (n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GH', { year: 'numeric', month: 'short', day: 'numeric' });
}

const agingBuckets = [
  { key: 'current', label: 'Current', color: 'text-green-600' },
  { key: 'days1to30', label: '1-30 Days', color: 'text-yellow-600' },
  { key: 'days31to60', label: '31-60 Days', color: 'text-orange-600' },
  { key: 'days61to90', label: '61-90 Days', color: 'text-red-500' },
  { key: 'days90plus', label: '90+ Days', color: 'text-red-700' },
];

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

// New Bill Modal
const showBillModal = ref(false);
const billForm = reactive({
  supplierId: '',
  description: '',
  amount: '' as string | number,
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  reference: '',
});

const submittingBill = ref(false);

async function createBill() {
  if (!billForm.supplierId || !billForm.description || !billForm.amount || !billForm.dueDate) {
    toast.add({ title: 'Please fill all required fields', color: 'red' });
    return;
  }
  submittingBill.value = true;
  try {
    await $fetch('/api/accounting/payables', {
      method: 'POST',
      body: {
        supplierId: billForm.supplierId,
        description: billForm.description,
        amount: Number(billForm.amount),
        issueDate: billForm.issueDate,
        dueDate: billForm.dueDate,
        reference: billForm.reference || undefined,
      },
    });
    toast.add({ title: 'Bill recorded', color: 'green' });
    showBillModal.value = false;
    await refresh();
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed to create bill', color: 'red' });
  } finally {
    submittingBill.value = false;
  }
}

// Payment Modal
const showPayModal = ref(false);
const payingRecord = ref<any>(null);
const payForm = reactive({
  amount: '' as string | number,
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethod: 'bankTransfer',
  reference: '',
  notes: '',
});

function openPay(record: any) {
  payingRecord.value = record;
  payForm.amount = record.balanceDue;
  payForm.paymentDate = new Date().toISOString().split('T')[0];
  payForm.paymentMethod = 'bankTransfer';
  payForm.reference = '';
  payForm.notes = '';
  showPayModal.value = true;
}

const submittingPay = ref(false);

async function recordPayment() {
  if (!payForm.amount || !payForm.paymentDate) {
    toast.add({ title: 'Amount and date required', color: 'red' });
    return;
  }
  submittingPay.value = true;
  try {
    await $fetch(`/api/accounting/payables/${payingRecord.value.id}/payment`, {
      method: 'POST',
      body: {
        amount: Number(payForm.amount),
        paymentDate: payForm.paymentDate,
        paymentMethod: payForm.paymentMethod,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined,
      },
    });
    toast.add({ title: 'Payment recorded', color: 'green' });
    showPayModal.value = false;
    await refresh();
  } catch (e: any) {
    toast.add({ title: e.data?.message || 'Failed to record payment', color: 'red' });
  } finally {
    submittingPay.value = false;
  }
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'bankTransfer', label: 'Bank Transfer' },
  { value: 'mobileMoney', label: 'Mobile Money' },
  { value: 'check', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between border-b border-gray-200 pb-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-gray-900">Accounts Payable</h1>
        <p class="mt-1 text-sm text-gray-500">Outstanding amounts owed to suppliers</p>
      </div>
      <UiButton @click="showBillModal = true">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        Record Bill
      </UiButton>
    </div>

    <div v-if="apData" class="space-y-6">
      <!-- Aging Summary -->
      <div class="grid grid-cols-6 gap-3">
        <div v-for="bucket in agingBuckets" :key="bucket.key" class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs font-medium text-gray-500">{{ bucket.label }}</p>
          <p class="mt-1 text-lg font-bold" :class="bucket.color">
            GHS {{ fmt((apData as any).summary[bucket.key]) }}
          </p>
        </div>
        <div class="rounded-xl border-2 border-gray-300 bg-gray-50 p-4">
          <p class="text-xs font-bold text-gray-500 uppercase">Total</p>
          <p class="mt-1 text-lg font-bold text-gray-900">GHS {{ fmt((apData as any).summary.totalOutstanding) }}</p>
        </div>
      </div>

      <!-- Records -->
      <div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div class="divide-y divide-gray-100">
          <div v-for="rec in (apData as any).records" :key="rec.id" class="px-6 py-4 hover:bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-gray-900">{{ rec.supplierId }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full" :class="statusColors[rec.status]">{{ rec.status }}</span>
                  <span v-if="rec.daysOverdue > 0" class="text-xs text-red-600">{{ rec.daysOverdue }}d overdue</span>
                </div>
                <p class="text-sm text-gray-600 mt-0.5">{{ rec.description }}</p>
                <p class="text-xs text-gray-400">
                  Due {{ formatDate(rec.dueDate) }}
                  <span v-if="rec.reference"> &middot; Ref: {{ rec.reference }}</span>
                </p>
              </div>
              <div class="text-right flex items-center gap-4">
                <div>
                  <p class="text-sm font-semibold text-gray-900">GHS {{ fmt(rec.balanceDue) }}</p>
                  <p class="text-xs text-gray-400">of GHS {{ fmt(rec.originalAmount) }}</p>
                </div>
                <button v-if="rec.status !== 'paid'" @click="openPay(rec)" class="text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
                  Pay
                </button>
              </div>
            </div>

            <div v-if="rec.payments?.length" class="mt-2 pl-4 border-l-2 border-gray-100 space-y-1">
              <div v-for="pmt in rec.payments" :key="pmt.id" class="flex justify-between text-xs text-gray-500">
                <span>{{ formatDate(pmt.paymentDate) }} — {{ pmt.paymentMethod }} <span v-if="pmt.reference">({{ pmt.reference }})</span></span>
                <span class="text-green-600 font-medium">GHS {{ fmt(pmt.amount) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="(apData as any).records.length === 0" class="px-6 py-12 text-center">
          <p class="text-sm text-gray-400">No outstanding payables</p>
        </div>
      </div>
    </div>

    <!-- New Bill Modal -->
    <UiModal v-model="showBillModal" title="Record Supplier Bill">
      <form @submit.prevent="createBill" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
          <input type="text" v-model="billForm.supplierId" required placeholder="Supplier name or ID" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <input type="text" v-model="billForm.description" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount (GHS) *</label>
            <input type="number" v-model="billForm.amount" required step="0.01" min="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input type="text" v-model="billForm.reference" placeholder="Invoice # from supplier" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
            <input type="date" v-model="billForm.issueDate" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
            <input type="date" v-model="billForm.dueDate" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <UiButton variant="outline" type="button" @click="showBillModal = false">Cancel</UiButton>
          <UiButton type="submit" :disabled="submittingBill">{{ submittingBill ? 'Saving...' : 'Record Bill' }}</UiButton>
        </div>
      </form>
    </UiModal>

    <!-- Payment Modal -->
    <UiModal v-model="showPayModal" title="Record Payment">
      <form @submit.prevent="recordPayment" class="space-y-4">
        <div v-if="payingRecord" class="bg-gray-50 rounded-lg p-3 text-sm">
          <p class="font-medium text-gray-900">{{ payingRecord.supplierId }}</p>
          <p class="text-gray-500">{{ payingRecord.description }}</p>
          <p class="text-gray-400">Balance: GHS {{ fmt(payingRecord.balanceDue) }}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Amount (GHS) *</label>
            <input type="number" v-model="payForm.amount" required step="0.01" min="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" v-model="payForm.paymentDate" required class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Method</label>
            <select v-model="payForm.paymentMethod" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option v-for="m in paymentMethods" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input type="text" v-model="payForm.reference" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea v-model="payForm.notes" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <UiButton variant="outline" type="button" @click="showPayModal = false">Cancel</UiButton>
          <UiButton type="submit" :disabled="submittingPay">{{ submittingPay ? 'Paying...' : 'Record Payment' }}</UiButton>
        </div>
      </form>
    </UiModal>
  </div>
</template>

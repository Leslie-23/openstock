<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const route = useRoute();
const slug = route.params.slug as string;
const toast = useToast();
const { keyUnlocked, authHeaders, lock } = useAdminConsole();

const detail = ref<{ customer: any; tables: string[]; databaseId: string | null } | null>(null);
const isLoading = ref(false);
const loadError = ref('');

const sql = ref('');
const isRunning = ref(false);
const queryResults = ref<any[] | null>(null);
const queryError = ref('');
const confirmDangerous = ref(false);

const looksDangerous = computed(() => /\b(update|delete|drop|alter|insert)\b/i.test(sql.value));

const nlPrompt = ref('');
const isGenerating = ref(false);

async function generateSql() {
  if (!nlPrompt.value.trim()) return;
  isGenerating.value = true;
  try {
    const res = await $fetch(`/api/admin/customers/${slug}/nl-query`, {
      method: 'POST',
      headers: authHeaders(),
      body: { prompt: nlPrompt.value },
    });
    sql.value = res.sql;
    confirmDangerous.value = false;
    toast.success('SQL generated', 'Review it below, then click Run Query.');
  } catch (e: any) {
    toast.error('Could not generate SQL', e.data?.message || 'Please try again');
  } finally {
    isGenerating.value = false;
  }
}

async function load() {
  if (!keyUnlocked.value) return;
  isLoading.value = true;
  loadError.value = '';
  try {
    detail.value = await $fetch(`/api/admin/customers/${slug}`, { headers: authHeaders() });
  } catch (e: any) {
    if (e.statusCode === 403) {
      toast.error('Invalid provisioning key', 'Locking the console — re-enter it.');
      lock();
    } else {
      loadError.value = e.data?.message || 'Failed to load this customer.';
      toast.error('Failed to load customer', loadError.value);
    }
  } finally {
    isLoading.value = false;
  }
}

watch(keyUnlocked, (v) => { if (v) load(); }, { immediate: true });

function insertTableQuery(table: string) {
  sql.value = `SELECT * FROM ${table} LIMIT 50;`;
}

async function runQuery() {
  if (!sql.value.trim()) return;
  if (looksDangerous.value && !confirmDangerous.value) {
    toast.warning('Confirm before running', 'Check the confirmation box — this statement can modify or delete data.');
    return;
  }

  isRunning.value = true;
  queryError.value = '';
  queryResults.value = null;
  try {
    const res = await $fetch(`/api/admin/customers/${slug}/query`, {
      method: 'POST',
      headers: authHeaders(),
      body: { sql: sql.value },
    });
    queryResults.value = res.results;
    confirmDangerous.value = false;
    toast.success('Query executed');
  } catch (e: any) {
    queryError.value = e.data?.message || 'Query failed';
  } finally {
    isRunning.value = false;
  }
}

const resultRows = computed(() => queryResults.value?.[0]?.results || []);
const resultColumns = computed(() => (resultRows.value.length ? Object.keys(resultRows.value[0]) : []));
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <NuxtLink to="/admin/customers" class="text-gray-500 hover:text-gray-300">
        <Icon name="lucide:arrow-left" class="h-5 w-5" />
      </NuxtLink>
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-white">{{ slug }}</h1>
        <p class="text-sm text-gray-400">Direct database access — every query is logged.</p>
      </div>
    </div>

    <AdminKeyGate>
      <div v-if="isLoading" class="py-16 text-center text-sm text-gray-500">Loading...</div>

      <div v-else-if="loadError" class="rounded-xl border border-red-900 bg-red-950/30 p-6 text-center">
        <Icon name="lucide:alert-circle" class="mx-auto h-6 w-6 text-red-400" />
        <p class="mt-2 text-sm text-red-300">{{ loadError }}</p>
        <button class="mt-3 text-sm text-primary-400 hover:underline" @click="load">Try again</button>
      </div>

      <template v-else-if="detail">
        <div class="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p class="text-xs text-gray-500">Business name</p>
          <p class="text-sm text-white">{{ detail.customer.businessName }}</p>
          <p class="mt-3 text-xs text-gray-500">URL</p>
          <a :href="detail.customer.url" target="_blank" rel="noopener noreferrer" class="text-sm text-primary-400 hover:underline">
            {{ detail.customer.url }}
          </a>
        </div>

        <div class="rounded-xl border border-amber-900 bg-amber-950/30 p-4">
          <div class="flex items-start gap-2">
            <Icon name="lucide:alert-triangle" class="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p class="text-xs text-amber-300">
              This runs raw SQL directly against "{{ slug }}"'s live database with no undo. Read queries are always safe;
              double-check anything that writes or deletes before running it.
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium uppercase tracking-wider text-gray-500">SQL Console</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="t in detail.tables"
                :key="t"
                class="rounded-full bg-gray-800 px-2 py-0.5 text-[11px] font-mono text-gray-400 hover:bg-gray-700 hover:text-white"
                @click="insertTableQuery(t)"
              >
                {{ t }}
              </button>
            </div>
          </div>

          <div class="flex gap-2">
            <input
              v-model="nlPrompt"
              type="text"
              placeholder="Describe what you want, e.g. show low stock products"
              class="flex-1 rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
              @keyup.enter="generateSql"
            />
            <button
              class="shrink-0 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              :disabled="isGenerating || !nlPrompt.trim()"
              @click="generateSql"
            >
              <Icon v-if="isGenerating" name="lucide:loader-2" class="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
              <Icon v-else name="lucide:sparkles" class="mr-1.5 inline h-3.5 w-3.5" />
              Generate SQL
            </button>
          </div>

          <textarea
            v-model="sql"
            rows="5"
            placeholder="SELECT * FROM products LIMIT 50;"
            class="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />

          <label v-if="looksDangerous" class="flex items-center gap-2 text-xs text-amber-300">
            <input v-model="confirmDangerous" type="checkbox" class="rounded border-gray-700 bg-gray-950" />
            I understand this may modify or delete data in "{{ slug }}"'s live database.
          </label>

          <button
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            :disabled="isRunning || !sql.trim()"
            @click="runQuery"
          >
            <Icon v-if="isRunning" name="lucide:loader-2" class="mr-2 inline h-4 w-4 animate-spin" />
            Run Query
          </button>

          <p v-if="queryError" class="text-sm text-red-400">{{ queryError }}</p>

          <div v-if="queryResults" class="overflow-x-auto rounded-md border border-gray-800">
            <table v-if="resultColumns.length" class="w-full text-left text-xs">
              <thead class="bg-gray-800">
                <tr>
                  <th v-for="col in resultColumns" :key="col" class="px-3 py-2 font-medium text-gray-300">{{ col }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-800">
                <tr v-for="(row, i) in resultRows" :key="i">
                  <td v-for="col in resultColumns" :key="col" class="px-3 py-2 text-gray-400">{{ row[col] }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="px-3 py-4 text-xs text-gray-500">Query ran successfully — no rows returned.</p>
          </div>
        </div>
      </template>
    </AdminKeyGate>
  </div>
</template>

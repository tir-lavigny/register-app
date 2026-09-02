# Register System — Implementation Plan

## API Endpoints

| Endpoint | Method | Returns | Notes |
|---|---|---|---|
| `GET /register/seasons/current` | GET | `SeasonResource` or 404 | Current active season |
| `POST /register/days` | POST | `OperatingDayResource` | Body: `{ season_id }` |
| `PATCH /register/days/:id` | PATCH | `OperatingDayResource` | Body: `{ status, cash_remark }` |
| `GET /register/days/current` | GET | `OperatingDayResource` | Includes `tickets: TicketResource[]` |
| `GET /register/days/:id` | GET | `OperatingDayResource` | Includes `tickets: TicketResource[]` |
| `POST /register/tickets` | POST | `Ticket` | Create ticket |
| `POST /register/tickets/preview` | POST | `{ total, items[] }` | Compute total without submitting |
| `GET /register/products` | GET | `Product[]` | List all products |
| `GET /register/categories` | GET | `Category[]` | List all categories |
| `GET /register/members` | GET | `MemberResource[]` | List all members |
| `GET /register/members/:id/vouchers` | GET | `Voucher[]` | Vouchers for a member |

**Missing endpoint:** No `GET /register/days/:id/tickets`. Tickets come embedded in the day response.

**Canceled tickets:** `TicketResource.deleted_at !== null` means the ticket was canceled.

---

## Key Data Models

### OperatingDayResource
```ts
interface OperatingDayResource {
  id: number
  date: string
  started_at: string
  closed_at: string | null
  season_id: number
  cash_remark: string | null
  closing_balance: string | null
  total_cash: string
  total_twint: string
  created_at: string | null
  updated_at: string | null
  tickets?: TicketResource[]  // embedded tickets
}
```

### TicketResource
```ts
interface TicketResource {
  id: number
  total: string
  payment_method: string
  operating_day_id: number
  member_id: number | null
  sold_at: string
  deleted_at: string | null        // non-null = canceled
  created_at: string | null
  updated_at: string | null
  ticketItems?: TicketItemResource[]
}
```

### TicketItemResource
```ts
interface TicketItemResource {
  id: number
  product_id: number
  ticket_id: number
  voucher_id: number | null
  quantity: number
  unit_price: string
  subtotal: string
  created_at: string | null
  updated_at: string | null
  product?: ProductResource
  voucher?: VoucherResource | null
}
```

### StoreTicketRequest (for POST /tickets and POST /tickets/preview)
```ts
interface StoreTicketRequest {
  payment_method: 'cash' | 'twint'
  operating_day_id: number
  member_id?: number | null
  sold_at: string
  items: Array<{
    product_id: number
    quantity: number           // minimum 1
    custom_unit_price?: number | null
    voucher_id?: number | null
  }>
}
```

### RegisterTicketsPreview200
```ts
interface RegisterTicketsPreview200 {
  total: number
  items: Array<{
    product_id: number
    voucher_id: number
    quantity: string
    unit_price: string
    subtotal: string
  }>
}
```

---

## Phase 0: Install Dependencies

```bash
npx shadcn-vue@latest add dialog     # modals (numpad, member select, etc.)
npx shadcn-vue@latest add drawer    # mobile ticket detail (vaul-vue)
npx shadcn-vue@latest add tabs      # category tabs in product grid
```

Already available: `Sheet` (reka-ui), `@vueuse/core` (`createReusableTemplate`, `useMediaQuery`).

---

## Phase 1: Pinia Stores

### 1.1 `season` Store (`src/stores/season.ts`)

```ts
// State
currentSeason: SeasonResource | null
error: string | null
loading: boolean

// Computed
seasonId: number | null  // currentSeason?.id ?? null

// Actions
fetchCurrentSeason()
  // GET /register/seasons/current
  // 200 → set season
  // 404 → set error: "Aucune saison active. Veuillez demander à un administrateur d'en créer une."
```

### 1.2 `operatingDay` Store (`src/stores/operating-day.ts`)

```ts
// State
currentDay: OperatingDayResource | null   // includes tickets[]
loading: boolean

// Computed
isOpen: boolean         // currentDay !== null && closed_at === null
dayId: number | null
activeTickets: TicketResource[]  // tickets where deleted_at === null
canceledTickets: TicketResource[] // tickets where deleted_at !== null
cashTotal: number       // sum of totals for cash tickets
twintTotal: number      // sum of totals for twint tickets

// Actions
fetchCurrentDay()
  // GET /register/days/current
  // 200 → set currentDay (with tickets)
  // 404 → set null

createDay(seasonId)
  // POST /register/days { season_id }
  // Guard: if isOpen → return error
  // 201 → set currentDay

closeDay(remark?)
  // PATCH /register/days/:id { status: 'closed', cash_remark }
  // Guard: if !isOpen → return error
  // 200 → returns closed OperatingDayResource with totals
  // Sets currentDay = null (or refreshes)

reopenDay()
  // PATCH /register/days/:id { status: 'open' }
  // Sets currentDay

refreshDay()
  // GET /register/days/:id  (re-fetch to get updated tickets after ticket creation)
```

### 1.3 `ticket` Store (`src/stores/ticket.ts`)

```ts
// Types
interface TicketDraftItem {
  productId: number
  productName: string
  quantity: number
  unitPrice: number               // from product.unit_price
  customUnitPrice: number | null  // set by user (only when allows_custom_price)
  effectivePrice: number          // customUnitPrice ?? unitPrice
  voucherId: number | null
  voucherDiscount: number | null  // absolute discount amount (client-side for display)
  lineTotal: number               // (effectivePrice * quantity) - voucherDiscount
}

interface TicketDraft {
  items: TicketDraftItem[]
  paymentMethod: 'cash' | 'twint' | null
  memberId: number | null
  memberName: string | null
}

// State
draft: TicketDraft | null
preview: RegisterTicketsPreview200 | null
previewLoading: boolean

// Computed
canFinalize: boolean  // items.length > 0 && paymentMethod !== null

// Actions
startDraft()

addProduct(product)
  // Caller opens QuantityDialog, then calls addItem with result

addItem(product, qty, customPrice?, voucher?)
  // Voucher: only applies if voucher.product_id === product.id
  // If same productId already in draft → merge (sum quantities)
  // After adding → fetchPreview()

removeItem(index)
  // After removing → fetchPreview()

updateItemQuantity(index, qty)
  // After updating → fetchPreview()

setPaymentMethod(method)
setMember(id, name)

fetchPreview()
  // POST /register/tickets/preview with StoreTicketRequest body
  // Sets preview on success

finalizeTicket(operatingDayId)
  // POST /register/tickets with StoreTicketRequest
  // 201 → clears draft + preview, returns success
  // Error → returns error
```

**Voucher discount** (client-side for display):
- `discount_percent`: `effectivePrice * quantity * (1 - discount_percent / 100)`
- `discount_fixed`: `effectivePrice * quantity - discount_fixed`
- Clamp to minimum 0.

**Preview:** Called after every draft modification. Sends full `StoreTicketRequest`. Returns server-computed total. Display this total in the draft panel.

---

## Phase 2: Routes and Navigation

### Routes (`src/router/index.ts`)

```ts
{ path: '/register',                component: RegisterDashboardView },
{ path: '/register/ticket/new',     component: TicketCreateView },
{ path: '/register/tickets',        component: TicketListView },
```

### Sidebar (`src/components/AppSidebar.vue`)

```ts
{
  title: 'Caisse',
  items: [
    { title: 'Tableau de bord', url: '/register' },
    { title: 'Nouveau ticket', url: '/register/ticket/new' },
    { title: 'Tickets du jour', url: '/register/tickets' },
  ],
}
```

---

## Phase 3: Views

### 3.1 `RegisterDashboardView` (`/register`)

**On mount:** fetch season → if 404, show `NoSeasonBanner`. Then fetch current day.

```
┌──────────────────────────────────────────────────┐
│  Saison: "Summer 2026"                            │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐  │
│  │ ● OUVERT — 02.09.2026                      │  │
│  │ Ouvert à 08:00                              │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐  │
│  │ 5 tickets                                 │  │
│  │ Espèces: CHF 245.00   Twint: CHF 87.50    │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  │  Nouveau   │ │  Tickets   │ │   Fermer   │   │
│  │  ticket    │ │  du jour   │ │   la journée│   │
│  └────────────┘ └────────────┘ └────────────┘   │
└──────────────────────────────────────────────────┘
```

**Dialogs:** `OpenDayDialog`, `CloseDayDialog`, `ReopenDayDialog`

### 3.2 `TicketCreateView` (`/register/ticket/new`)

**On mount:** redirect if no open day.

**Flow when tapping a product:**
1. User taps product card
2. `QuantityDialog` opens (always — no implicit x1)
   - Shows product name, price, quantity numpad
   - If `allows_custom_price`: also shows editable price field with numpad
   - If not `allows_custom_price`: price field is read-only
3. User sets quantity (and optionally custom price), confirms
4. Item added to draft → `fetchPreview()` → total updates

```
┌──────────────────────────────────────────────────┐
│  ← Retour                    Total: CHF 16.00    │
├──────────────────────────────────────────────────┤
│  [Boissons] [Nourriture] [Snacks] [Tout]         │
│                                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐                 │
│  │ Cola   │ │ Eau    │ │ Café   │                 │
│  │ CHF 3.5│ │ CHF 2.0│ │ CHF 4.0│                 │
│  └────────┘ └────────┘ └────────┘                 │
├──────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐│
│  │ 2x Cola       CHF 7.00     [-][2][+] [×]    ││
│  │ 1x Café       CHF 4.00     [-][1][+] [×]    ││
│  │ 1x Bière      CHF 5.00     [-][1][+] [×]    ││
│  │──────────────────────────────────────────────││
│  │ Total: CHF 16.00 (from preview endpoint)     ││
│  │                                              ││
│  │ Membre: [Sélectionner...]                    ││
│  │ Paiement:   [  💵 Espèces  ] [  📱 Twint  ] ││
│  │                                              ││
│  │ [ ✅ Finaliser le ticket ]                   ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

**Interactions (all via Dialog):**
- **Tap product card** → `QuantityDialog` opens
- **Tap +/- on draft item** → `QuantityDialog` with current quantity
- **Tap × on draft item** → remove → `fetchPreview()`
- **Tap "Sélectionner..."** → `MemberSelectDialog` → select member → fetch vouchers
- **Tap voucher icon** → `VoucherSelectDialog` (filtered to product)
- **Tap payment method** → toggle Cash/Twint
- **Tap "Finaliser"** → POST /tickets → success toast → refresh day → navigate

### 3.3 `TicketListView` (`/register/tickets`)

**On mount:** tickets from `operatingDay` store.

```
┌──────────────────────────────────────────────────┐
│  ← Retour     Tickets du jour — 02.09.2026       │
├──────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐│
│  │ Espèces: CHF 245.00  │ Twint: CHF 87.50     ││
│  │ Total: CHF 332.50    │ Tickets: 12           ││
│  └──────────────────────────────────────────────┘│
├──────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐│
│  │ Ticket #4501   09:15   CHF 45.00   Espèces   ││
│  │ Ticket #4502   10:30   CHF 12.50   Twint     ││
│  │ ~~Ticket #4503 11:00   CHF 78.00   Espèces~~ ││
│  │              (annulé)                         ││
│  └──────────────────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

Canceled tickets (`deleted_at !== null`): strikethrough + "(annulé)".

**Tap a ticket** → opens responsive `TicketDetail` (Sheet on desktop / Drawer on mobile).

---

## Phase 4: Components

### Day Management

| Component | Description |
|---|---|
| `NoSeasonBanner.vue` | Full-page error when no season active |
| `DayStatusCard.vue` | Status, date, times, Open/Close/Reopen buttons |
| `DaySummaryCard.vue` | Ticket count, cash total, twint total |
| `OpenDayDialog.vue` | Confirmation to open day |
| `CloseDayDialog.vue` | Summary + cash remark textarea |
| `ReopenDayDialog.vue` | Confirmation to reopen day |

### Ticket Creation

| Component | Description |
|---|---|
| `ProductGrid.vue` | Category tabs + product card grid |
| `ProductCard.vue` | Product name, price, image. Large tap target (>=48px) |
| `QuantityDialog.vue` | **Always opens when tapping a product.** Numpad for quantity. If `allows_custom_price`: editable price field. |
| `TicketDraftPanel.vue` | Running summary. Total from preview endpoint. |
| `TicketDraftItemRow.vue` | Item: name, qty +/-, price, remove, voucher button |
| `PaymentSelector.vue` | Two large buttons: Espèces / Twint |
| `MemberSelectDialog.vue` | Searchable member list |
| `VoucherSelectDialog.vue` | Member's vouchers filtered to product |

### Ticket Display (Responsive)

| Component | Description |
|---|---|
| `TicketDetailContent.vue` | Shared content: ticket info, items, product names, totals |
| `TicketDetail.vue` | Responsive wrapper: `createReusableTemplate` + `useMediaQuery` → Sheet (>=md) or Drawer (<md) |
| `TicketListTable.vue` | List of tickets. Canceled shown with strikethrough. |

### QuantityDialog Detail

Always opens when tapping a product. Large numpad for tablet/mobile.

```
┌─────────────────────────────────────────┐
│  Café — CHF 4.00                        │
├─────────────────────────────────────────┤
│                                          │
│  Prix unitaire:  [CHF 4.00]             │
│                   (disabled if           │
│                    !allows_custom_price) │
│                                          │
│  Quantité:                               │
│  ┌───┐                                   │
│  │ 1 │                                   │
│  └───┘                                   │
│                                          │
│  ┌───┬───┬───┐                           │
│  │ 1 │ 2 │ 3 │                           │
│  ├───┼───┼───┤                           │
│  │ 4 │ 5 │ 6 │                           │
│  ├───┼───┼───┤                           │
│  │ 7 │ 8 │ 9 │                           │
│  ├───┼───┼───┤                           │
│  │ ⌫ │ 0 │ ✓ │                           │
│  └───┴───┴───┘                           │
│                                          │
│  Sous-total: CHF 4.00                    │
├─────────────────────────────────────────┤
│  [Annuler]              [Ajouter]        │
└─────────────────────────────────────────┘
```

If `allows_custom_price`, tapping the price field switches the numpad to price mode.

### TicketDetail Responsive Pattern

```vue
<script setup lang="ts">
import { createReusableTemplate, useMediaQuery } from '@vueuse/core'

const isDesktop = useMediaQuery('(min-width: 768px)')

const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{
  ticket: TicketResource
}>()
</script>

<template>
  <DefineTemplate v-slot="{ ticket }">
    <TicketDetailContent :ticket="ticket" />
  </DefineTemplate>

  <Sheet v-if="isDesktop" :open="open" @update:open="$emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Ticket #{{ ticket.id }}</SheetTitle>
      </SheetHeader>
      <ReuseTemplate :ticket="ticket" />
    </SheetContent>
  </Sheet>

  <Drawer v-else :open="open" @update:open="$emit('update:open', $event)">
    <DrawerContent class="max-h-[85vh]">
      <ReuseTemplate :ticket="ticket" />
    </DrawerContent>
  </Drawer>
</template>
```

---

## Phase 5: Testing Strategy

### Store Tests

**`src/stores/season.spec.ts`**
- `fetchCurrentSeason()`: 200 → sets season; 404 → sets error
- `seasonId`: returns id or null

**`src/stores/operating-day.spec.ts`**
- `fetchCurrentDay()`: 200 → sets day with tickets; 404 → sets null
- `createDay()`: 201 → sets day; blocks if already open
- `closeDay()`: 200 → returns closed day with totals; blocks if no day
- `reopenDay()`: 200 → sets currentDay
- `activeTickets`, `canceledTickets` computed: filters by deleted_at
- `cashTotal`, `twintTotal` computed: sums correctly
- `isOpen`, `dayId` computed

**`src/stores/ticket.spec.ts`**
- `startDraft()`: creates empty draft
- `addItem()`: adds item; handles custom price; handles voucher discount (matching product_id only)
- `addItem()` duplicate: merges quantities
- `removeItem()`, `updateItemQuantity()`
- `fetchPreview()`: sends draft to preview endpoint; sets preview.total
- `canFinalize`: false when empty; false when no payment; true when ready
- `finalizeTicket()`: 201 → clears draft; error → returns error
- `setPaymentMethod()`, `setMember()`

### Component Tests

| Test File | Key Tests |
|---|---|
| `DayStatusCard.spec.ts` | Open/closed rendering; button visibility |
| `DaySummaryCard.spec.ts` | Correct totals displayed |
| `ProductGrid.spec.ts` | Products rendered; category filter works |
| `ProductCard.spec.ts` | Name/price displayed; click emits |
| `QuantityDialog.spec.ts` | Opens with qty=1; numpad input; custom price enabled/disabled; confirms |
| `TicketDraftPanel.spec.ts` | Items rendered; total from preview; empty state |
| `TicketDraftItemRow.spec.ts` | Item details; +/- buttons; remove button |
| `PaymentSelector.spec.ts` | Two buttons; selection; active state |
| `MemberSelectDialog.spec.ts` | Member list; selection; search |
| `VoucherSelectDialog.spec.ts` | Vouchers filtered by product; selection |
| `CloseDayDialog.spec.ts` | Summary; remark textarea; confirm |
| `TicketDetailContent.spec.ts` | Ticket info; items with product names; canceled state |
| `TicketListTable.spec.ts` | Tickets rendered; canceled strikethrough; empty state |

### View Tests

| Test File | Key Tests |
|---|---|
| `RegisterDashboardView.spec.ts` | No season → error; no day → open button; day open → info + tickets |
| `TicketCreateView.spec.ts` | No day → redirect; tap product → dialog → add; finalize → success |
| `TicketListView.spec.ts` | Tickets from store; totals; tap opens detail |

### Mocking Strategy

- **Stores:** `vi.mock()` for API modules (auth store pattern)
- **Components:** MSW handlers from `*.msw.ts` + `createTestingPinia` + `@vue/test-utils`
- **Views:** MSW + `createTestingPinia` + `router.push()` + `flushPromises()`

---

## Phase 6: Implementation Order

| Step | Files | Est. |
|---|---|---|
| 1 | Install shadcn-vue `dialog`, `drawer`, `tabs` | Small |
| 2 | `src/stores/season.ts` + tests | Small |
| 3 | `src/stores/operating-day.ts` + tests | Medium |
| 4 | `src/stores/ticket.ts` + tests (preview integration) | Large |
| 5 | Router + Sidebar updates | Small |
| 6 | `NoSeasonBanner.vue` + tests | Small |
| 7 | `DayStatusCard.vue` + `DaySummaryCard.vue` + tests | Medium |
| 8 | `OpenDayDialog.vue` + `CloseDayDialog.vue` + `ReopenDayDialog.vue` + tests | Medium |
| 9 | `RegisterDashboardView.vue` + tests | Medium |
| 10 | `ProductGrid.vue` + `ProductCard.vue` + tests | Medium |
| 11 | `QuantityDialog.vue` + tests | Medium |
| 12 | `TicketDraftPanel.vue` + `TicketDraftItemRow.vue` + tests | Medium |
| 13 | `PaymentSelector.vue` + `MemberSelectDialog.vue` + `VoucherSelectDialog.vue` + tests | Medium |
| 14 | `TicketCreateView.vue` + tests | Large |
| 15 | `TicketDetailContent.vue` + `TicketDetail.vue` (responsive) + tests | Medium |
| 16 | `TicketListTable.vue` + `TicketListView.vue` + tests | Medium |
| 17 | Integration test: full ticket creation flow | Medium |
| 18 | Polish: loading states, error toasts, empty states | Small |

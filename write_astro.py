import os

header = """  <header class="sticky top-0 z-50 w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-lg shadow-indigo-500/20">
    <div class="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
      <a href="/" class="font-extrabold text-lg tracking-tight flex items-center gap-2">MicroBusiness365</a>
      <nav class="hidden md:flex items-center gap-6 text-sm font-medium">
        <a href="/app" class="hover:text-white/80 transition-colors">Overview</a>
        <a href="/sales" class="hover:text-white/80 transition-colors">Sales</a>
        <a href="/inventory" class="hover:text-white/80 transition-colors">Inventory</a>
        <a href="/customers" class="hover:text-white/80 transition-colors">Customers</a>
        <a href="/expenses" class="hover:text-white/80 transition-colors">Expenses</a>
        <a href="/invoices" class="hover:text-white/80 transition-colors">Invoices</a>
        <a href="/reports" class="hover:text-white/80 transition-colors">Reports</a>
        <a href="/tools" class="hover:text-white/80 transition-colors">Tools</a>
        <a href="/settings" class="hover:text-white/80 transition-colors">Settings</a>
      </nav>
      <a href="/app" class="text-sm font-semibold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">Dashboard</a>
    </div>
  </header>"""

main_open = """  <main class="w-full pt-24 pb-16 px-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">"""
main_close = """    </div>
  </main>"""

footer = """  <footer class="w-full bg-[var(--color-surface)] dark:bg-[#0a0a0a] border-t border-[var(--color-border)] text-[var(--color-text-secondary)]">
    <div class="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <div><h4 class="font-bold text-[var(--color-text-primary)] mb-3">MicroBusiness365</h4><p class="text-sm text-[var(--color-text-secondary)] leading-relaxed">Simple business tools for small shops, freelancers, and home businesses.</p></div>
      <div><h4 class="font-semibold text-[var(--color-text-primary)] mb-3">Sections</h4><ul class="space-y-1.5 text-sm"><li><a href="/app" class="hover:text-[var(--color-text-primary)]">Overview</a></li><li><a href="/sales" class="hover:text-[var(--color-text-primary)]">Sales</a></li><li><a href="/inventory" class="hover:text-[var(--color-text-primary)]">Inventory</a></li><li><a href="/customers" class="hover:text-[var(--color-text-primary)]">Customers</a></li></ul></div>
      <div><h4 class="font-semibold text-[var(--color-text-primary)] mb-3">More</h4><ul class="space-y-1.5 text-sm"><li><a href="/expenses" class="hover:text-[var(--color-text-primary)]">Expenses</a></li><li><a href="/invoices" class="hover:text-[var(--color-text-primary)]">Invoices</a></li><li><a href="/reports" class="hover:text-[var(--color-text-primary)]">Reports</a></li><li><a href="/settings" class="hover:text-[var(--color-text-primary)]">Settings</a></li></ul></div>
      <div><h4 class="font-semibold text-[var(--color-text-primary)] mb-3">Resources</h4><ul class="space-y-1.5 text-sm"><li><a href="/tools" class="hover:text-[var(--color-text-primary)]">Tools</a></li><li><a href="#about" class="hover:text-[var(--color-text-primary)]">About</a></li></ul></div>
    </div>
    <div class="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-5 border-t border-[var(--color-border)] flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]"><span>&copy; 2026 MicroBusiness365.</span><span>Local-first, ad-free</span></div>
  </footer>"""

base = "C:/Users/surya/OneDrive/Desktop/hello2/microbusiness/microbusiness365/src/pages"

def write(path, fm, title, inner):
    content = f"---\n{fm}\n---\n<Layout title=\"{title}\">\n{header}\n\n{main_open}\n{inner}\n{main_close}\n\n{footer}\n</Layout>\n"
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(content)
    print("Wrote", path, "chars:", len(content))

# 1 sales
write(f"{base}/sales/index.astro",
      "import Layout from '../../layouts/Layout.astro';\nimport SalesManager from '../../components/shared/SalesManager';",
      "Sales - MicroBusiness365",
      '    <div class="max-w-5xl mx-auto p-6">\n      <h1 class="text-2xl font-bold mb-1">Sales</h1>\n      <p class="text-[var(--color-text-secondary)] mb-6">Record sales, receive payments, track what customers owe.</p>\n      <SalesManager client:load />\n    </div>')

# 2 inventory
write(f"{base}/inventory/index.astro",
      "import Layout from '../../layouts/Layout.astro';\nimport InventoryManager from '../../components/shared/InventoryManager';",
      "Inventory - MicroBusiness365",
      '    <div class="max-w-5xl mx-auto p-6">\n      <h1 class="text-2xl font-bold mb-1">Inventory</h1>\n      <p class="text-[var(--color-text-secondary)] mb-6">Manage products, stock, and low-stock alerts.</p>\n      <InventoryManager client:load />\n    </div>')

# 3 expenses
write(f"{base}/expenses/index.astro",
      "import Layout from '../../layouts/Layout.astro';\nimport ExpenseManager from '../../components/shared/ExpenseManager';",
      "Expenses - MicroBusiness365",
      '    <div class="max-w-5xl mx-auto p-6">\n      <h1 class="text-2xl font-bold mb-1">Expenses</h1>\n      <p class="text-[var(--color-text-secondary)] mb-6">Track costs that affect your profit.</p>\n      <ExpenseManager client:load />\n    </div>')

# 4 invoices
write(f"{base}/invoices/index.astro",
      "import Layout from '../../layouts/Layout.astro';\nimport InvoiceManager from '../../components/invoices/InvoiceManager';",
      "Invoices - MicroBusiness365",
      '    <div class="max-w-6xl mx-auto p-6">\n      <InvoiceManager />\n    </div>')

# 5 reports
write(f"{base}/reports/index.astro",
      "import Layout from '../../layouts/Layout.astro';\nimport Reports from '../../components/reports/Reports';",
      "Reports - MicroBusiness365",
      '    <div class="max-w-6xl mx-auto p-6">\n      <Reports />\n    </div>')

# 6 settings
write(f"{base}/settings/index.astro",
      "import Layout from '../../layouts/Layout.astro';\nimport SettingsForm from '../../components/settings/SettingsForm';",
      "Settings - MicroBusiness365",
      "    <SettingsForm />")

# 7 tools
write(f"{base}/tools/index.astro",
      "import Layout from '../../layouts/Layout.astro';\nimport ToolsGrid from '../../components/shared/ToolsGrid';",
      "Tools - MicroBusiness365",
      '    <div class="mx-auto max-w-6xl px-6 text-center mb-12">\n      <h1 class="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] mb-3">Business Management Tools</h1>\n      <p class="text-[var(--color-text-secondary)] max-w-2xl mx-auto">Sales, inventory, customers, expenses, invoices, quotations, payments, insights - all connected to Dexie.</p>\n    </div>\n    <ToolsGrid />')

# Danza-son ERP - Procurement & Purchasing Module

> **React Frontend + Node.js Express Backend + MongoDB Database**  
> Built as an exact implementation of the **Danza-son ERP Purchase Module** ([Live Reference](https://erp-frontend-theta-fawn.vercel.app/purchase)).

---

## 🚀 Key Sub-Modules & Features

1. **Purchase Dashboard (`/purchase`)**
   - KPI Stat Cards: Active Suppliers, Requisitions (PR), Purchase Orders (PO), Goods Receipts (GRN)
   - 5-Step Visual Procurement Flow:
     - Step 1: Requisition (PR)
     - Step 2: Purchase Order (PO)
     - Step 3: GRN Receiving
     - Step 4: Incoming QC & Inward
     - Step 5: Supplier Invoices
   - Quick Navigation shortcuts & Recent Orders table.

2. **Suppliers Directory (`/purchase/suppliers`)**
   - Comprehensive supplier management with Code (`SUP-XXXX`), GSTIN, PAN, Phone, Email.
   - Contact Person details, Location (City, State, Pincode).
   - Rating (1 to 5 stars), Payment Terms, Credit Limit, and Pending Balances.
   - Add / Edit Supplier modal with inline **Quick Add Category** support.

3. **Supplier Categories (`/purchase/categories`)**
   - Category Classification (Raw Materials, Fabric & Textiles, Packaging, Hardware & Trims, Dyes & Chemicals).
   - Status (Active / Inactive), Code, Description, Add/Edit/Delete actions.

4. **Inquiries & Quotations / RFQ (`/purchase/inquiries`)**
   - Issue Request for Quotation (RFQ) to multiple suppliers based on category.
   - Dynamic line items with target prices, UOMs, and descriptions.
   - **Compare & Award Quotations Modal**: Compare vendor rate bids and delivery dates, accept/reject with rationale.

5. **Purchase Requisitions (PR) (`/purchase/requisitions`)**
   - Internal purchase demands with Department, Priority (Urgent/High/Medium/Low), Warehouse, Reason.
   - Dynamic line items with product picker and estimated rates.
   - Requisition review modal with one-click approval/rejection.

6. **Purchase Orders (`/purchase/orders`) & Detail (`/purchase/orders/:id`)**
   - Commercial agreements issued to approved suppliers.
   - Interstate GST tax handling (IGST vs CGST + SGST) with automatic round off.
   - Receipt tracking (Ordered Qty, Received Qty, Pending Qty).
   - Printable Purchase Order view.
   - One-click **Convert to GRN** button.

7. **Goods Receipts Notes (GRN) (`/purchase/grn`) & Detail (`/purchase/grn/:id`)**
   - Inward physical goods receiving supporting **Partial Inwards**.
   - Vendor Challan #, Challan Date, Vehicle Number, Driver / Transporter.
   - File attachment upload (Challan PDF/Image base64 with preview).
   - Batch / Lot numbering and QC status.
   - **Post GRN to Stock**: Real-time inventory balance increment upon receiving.

8. **Supplier Invoices / Vendor Bills (`/purchase/invoices`)**
   - 3-Way match linking Vendor Invoices with PO and GRN.
   - Input Tax Credit (ITC) tracking, Taxable amounts, and Grand Totals.
   - View commercial invoice breakdown and record vendor bills.

9. **Purchase Returns & Debit Notes (`/purchase/returns`)**
   - Manage damaged, scrap, or rejected materials returned to vendors.
   - Automatic stock deduction upon return generation.
   - Debit note values and return reason logging.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, React Router DOM, Tailwind CSS, Lucide React, Axios.
- **Backend**: Node.js, Express.js, Mongoose, CORS, Morgan, Dotenv.
- **Database**: MongoDB (Supports local `mongodb://127.0.0.1:27017/danzason_erp`, MongoDB Atlas, or built-in auto-starting Embedded MongoDB Memory Server for zero-setup instant development).

---

## 🏃‍♂️ How to Run

### 1. Start Backend Server
```bash
cd backend
npm install
npm run dev
```
Backend runs at `http://localhost:5000` (API endpoint: `http://localhost:5000/api/v1`).

### 2. Start Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## 📁 Project Structure

```
danzason/
├── backend/
│   ├── src/
│   │   ├── config/ (db.js - MongoDB connector with embedded fallback)
│   │   ├── models/ (Mongoose schemas for Categories, Suppliers, Warehouses, Products, PRs, POs, GRNs, Invoices, Returns)
│   │   ├── controllers/ (purchaseController.js)
│   │   ├── routes/ (purchaseRoutes.js, adminRoutes.js, productRoutes.js)
│   │   ├── seed/ (seedData.js - Initial ERP sample data)
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/ (DataTable, Modal, PageHeader, StatsCard, StatusBadge)
│   │   │   └── layout/ (Layout, Navbar, Sidebar)
│   │   ├── pages/
│   │   │   └── purchase/ (Dashboard, Suppliers, Categories, Inquiries, PR, Orders, OrderDetail, GRN, GRNDetail, Invoices, Returns)
│   │   ├── services/ (procurementService.js)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── package.json
```

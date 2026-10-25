import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import SuppliersDirectory from './pages/purchase/SuppliersDirectory';
import SupplierDetail from './pages/purchase/SupplierDetail';
import SupplierCategories from './pages/purchase/SupplierCategories';
import InquiriesQuotations from './pages/purchase/InquiriesQuotations';
import PurchaseRequisitions from './pages/purchase/PurchaseRequisitions';
import PurchaseOrders from './pages/purchase/PurchaseOrders';
import PurchaseOrderDetail from './pages/purchase/PurchaseOrderDetail';
import PurchaseOrderForm from './pages/purchase/PurchaseOrderForm';
import GrnList from './pages/purchase/GrnList';
import GrnDetail from './pages/purchase/GrnDetail';
import SupplierInvoices from './pages/purchase/SupplierInvoices';
import PurchaseBillForm from './pages/purchase/PurchaseBillForm';
import PurchaseReturns from './pages/purchase/PurchaseReturns';
import PurchaseReturnForm from './pages/purchase/PurchaseReturnForm';
import PurchaseSettings from './pages/purchase/PurchaseSettings';
import CustomersDirectory from './pages/sales/CustomersDirectory';
import CustomerDetail from './pages/sales/CustomerDetail';
import LeadManagement from './pages/sales/LeadManagement';
import SalesOrders from './pages/sales/SalesOrders';
import SalesInvoices from './pages/sales/SalesInvoices';
import InvoiceEdit from './pages/sales/InvoiceEdit';
import SalesReturns from './pages/sales/SalesReturns';
import UpsellCrossSellManagement from './pages/sales/UpsellCrossSellManagement';
import RepeatOrderManagement from './pages/sales/RepeatOrderManagement';
import ComplaintManagement from './pages/customerService/ComplaintManagement';
import SalesForecasting from './pages/sales/SalesForecasting';
import MarketingDashboard from './pages/marketing/MarketingDashboard';
import TargetGoalManagement from './pages/growth/TargetGoalManagement';
import CeoCommandCenter from './pages/dashboard/CeoCommandCenter';
import ProductsList from './pages/products/ProductsList';
import ProductStockLedger from './pages/products/ProductStockLedger';
import RawMaterialCatalog from './pages/rawMaterials/RawMaterialCatalog';
import RawMaterialStockLedger from './pages/rawMaterials/RawMaterialStockLedger';
import RawMaterialSuppliers from './pages/rawMaterials/RawMaterialSuppliers';
import RawMaterialOrders from './pages/rawMaterials/RawMaterialOrders';
import RawMaterialBills from './pages/rawMaterials/RawMaterialBills';
import ProcessingContractors from './pages/processing/ProcessingContractors';
import ProcessingContractorDetail from './pages/processing/ProcessingContractorDetail';
import ProcessingOrders from './pages/processing/ProcessingOrders';
import ProcessingBills from './pages/processing/ProcessingBills';
import ProcessingMaterialTracking from './pages/processing/ProcessingMaterialTracking';
import FinanceModule from './pages/finance/FinanceModule';
import OwnerCapitalManagement from './pages/finance/OwnerCapitalManagement';
import TeamManagement from './pages/team/TeamManagement';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/api/v1/sales/forecasting" element={<Navigate to="/sales/forecasting" replace />} />
          <Route path="/api/sales/forecasting" element={<Navigate to="/sales/forecasting" replace />} />
          <Route path="/api/v1/forecasting" element={<Navigate to="/sales/forecasting" replace />} />
          <Route path="/api/forecasting" element={<Navigate to="/sales/forecasting" replace />} />

          {/* Protected Danza Son Admin & Procurement ERP Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
          <Route index element={<CeoCommandCenter />} />
          <Route path="dashboard" element={<CeoCommandCenter />} />
          <Route path="ceo-command-center" element={<CeoCommandCenter />} />
          
          {/* Products Catalog & Stock Ledger */}
          <Route path="products" element={<ProductsList />} />
          <Route path="products/:id/ledger" element={<ProductStockLedger />} />
          <Route path="products/ledger/:id" element={<ProductStockLedger />} />
          <Route path="sales/products" element={<ProductsList />} />
          <Route path="sales/products/:id/ledger" element={<ProductStockLedger />} />

          {/* Raw Materials Catalog & Stock Ledger */}
          <Route path="raw-materials" element={<RawMaterialCatalog />} />
          <Route path="raw-materials/suppliers" element={<RawMaterialSuppliers />} />
          <Route path="raw-materials/orders" element={<RawMaterialOrders />} />
          <Route path="raw-materials/bills" element={<RawMaterialBills />} />
          <Route path="raw-materials/:id/ledger" element={<RawMaterialStockLedger />} />
          <Route path="raw-materials/ledger/:id" element={<RawMaterialStockLedger />} />

          {/* Processing / Manufacturing / Job Work Module */}
          <Route path="processing" element={<Navigate to="/processing/orders" replace />} />
          <Route path="processing/contractors" element={<ProcessingContractors />} />
          <Route path="processing/contractors/:id" element={<ProcessingContractorDetail />} />
          <Route path="processing/suppliers" element={<ProcessingContractors />} />
          <Route path="processing/quotations" element={<InquiriesQuotations />} />
          <Route path="processing/orders" element={<ProcessingOrders />} />
          <Route path="processing/bills" element={<ProcessingBills />} />
          <Route path="processing/material-tracking" element={<ProcessingMaterialTracking />} />
          <Route path="manufacturing/contractors" element={<ProcessingContractors />} />
          <Route path="manufacturing/contractors/:id" element={<ProcessingContractorDetail />} />
          <Route path="manufacturing/quotations" element={<InquiriesQuotations />} />
          <Route path="manufacturing/orders" element={<ProcessingOrders />} />
          <Route path="manufacturing/bills" element={<ProcessingBills />} />
          <Route path="manufacturing/tracking" element={<ProcessingMaterialTracking />} />

          {/* Marketing, Growth & Lead Generation */}
          <Route path="marketing" element={<MarketingDashboard />} />
          <Route path="sales/marketing" element={<MarketingDashboard />} />
          <Route path="marketing/campaigns" element={<MarketingDashboard />} />

          {/* Sales & Distribution */}
          <Route path="sales" element={<Navigate to="/sales/quotations" replace />} />
          <Route path="sales/leads" element={<LeadManagement />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="sales/followups" element={<LeadManagement />} />
          <Route path="sales/applications" element={<Navigate to="/sales/leads" replace />} />
          <Route path="sales-applications" element={<Navigate to="/sales/leads" replace />} />
          <Route path="sales/customers" element={<CustomersDirectory />} />
          <Route path="sales/customers/:id" element={<CustomerDetail />} />
          <Route path="sales/quotations" element={<SalesOrders />} />
          <Route path="sales/orders" element={<SalesOrders />} />
          <Route path="sales/invoices" element={<SalesInvoices />} />
          <Route path="sales/invoices/:id/edit" element={<InvoiceEdit />} />
          <Route path="sales/returns" element={<SalesReturns />} />
          <Route path="sales/upsell" element={<UpsellCrossSellManagement />} />
          <Route path="sales/upsell-cross-sell" element={<UpsellCrossSellManagement />} />
          <Route path="upsell" element={<UpsellCrossSellManagement />} />
          <Route path="sales/repeat-orders" element={<RepeatOrderManagement />} />
          <Route path="sales/repeat-orders/:id/convert" element={<RepeatOrderManagement />} />
          <Route path="sales/repeat" element={<RepeatOrderManagement />} />
          <Route path="repeat-orders" element={<RepeatOrderManagement />} />
          <Route path="sales/complaints" element={<ComplaintManagement />} />
          <Route path="customer-service" element={<ComplaintManagement />} />
          <Route path="complaints" element={<ComplaintManagement />} />
          <Route path="sales/forecasting" element={<SalesForecasting />} />
          <Route path="sales/forecast" element={<SalesForecasting />} />
          <Route path="forecasting" element={<SalesForecasting />} />
          <Route path="forecast" element={<SalesForecasting />} />

          {/* Growth & Target Goal Management */}
          <Route path="growth/targets" element={<TargetGoalManagement />} />
          <Route path="targets" element={<TargetGoalManagement />} />
          <Route path="goals" element={<TargetGoalManagement />} />
          <Route path="target-goals" element={<TargetGoalManagement />} />
          <Route path="sales/targets" element={<TargetGoalManagement />} />

          {/* Finance & Accounts Management */}
          <Route path="finance" element={<FinanceModule />} />
          <Route path="finance/overview" element={<FinanceModule />} />
          <Route path="finance/transactions" element={<FinanceModule />} />
          <Route path="finance/income" element={<FinanceModule />} />
          <Route path="finance/expenses" element={<FinanceModule />} />
          <Route path="finance/profitability" element={<FinanceModule />} />
          <Route path="finance/reports" element={<FinanceModule />} />
          <Route path="finance/capital" element={<OwnerCapitalManagement />} />
          <Route path="finance/drawings" element={<OwnerCapitalManagement />} />
          <Route path="capital" element={<OwnerCapitalManagement />} />
          <Route path="drawings" element={<OwnerCapitalManagement />} />
          <Route path="owner-capital" element={<OwnerCapitalManagement />} />

          {/* Team Members, Performance & RBAC Access Management */}
          <Route path="team" element={<TeamManagement />} />
          <Route path="team/performance" element={<TeamManagement />} />
          <Route path="team/members" element={<TeamManagement />} />

          {/* Purchase & Procurement */}
          <Route path="purchase" element={<Navigate to="/purchase/suppliers" replace />} />
          <Route path="purchase/suppliers" element={<SuppliersDirectory />} />
          <Route path="purchase/suppliers/:id" element={<SupplierDetail />} />
          <Route path="purchase/categories" element={<Navigate to="/purchase/settings" replace />} />
          <Route path="purchase/settings" element={<PurchaseSettings />} />
          <Route path="settings" element={<Navigate to="/purchase/settings" replace />} />
          <Route path="purchase/inquiries" element={<InquiriesQuotations />} />
          <Route path="purchase/requisitions" element={<PurchaseRequisitions />} />

          {/* Purchase Orders (Full-Page Routes & Aliases) */}
          <Route path="purchase/orders" element={<PurchaseOrders />} />
          <Route path="purchase/orders/create" element={<PurchaseOrderForm />} />
          <Route path="purchase/orders/:id/edit" element={<PurchaseOrderForm />} />
          <Route path="purchase/orders/:id" element={<PurchaseOrderDetail />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase-orders/create" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/edit/:id" element={<PurchaseOrderForm />} />
          <Route path="purchase-orders/:id/edit" element={<PurchaseOrderForm />} />

          {/* Goods Receipt Notes */}
          <Route path="purchase/grn" element={<GrnList />} />
          <Route path="purchase/grn/:id" element={<GrnDetail />} />

          {/* Purchase Bills / Invoices (Full-Page Routes & Aliases) */}
          <Route path="purchase/invoices" element={<SupplierInvoices />} />
          <Route path="purchase/invoices/create" element={<PurchaseBillForm />} />
          <Route path="purchase/invoices/:id/edit" element={<PurchaseBillForm />} />
          <Route path="purchase-bills" element={<SupplierInvoices />} />
          <Route path="purchase-bills/create" element={<PurchaseBillForm />} />
          <Route path="purchase-bills/edit/:id" element={<PurchaseBillForm />} />
          <Route path="purchase-bills/:id/edit" element={<PurchaseBillForm />} />

          {/* Purchase Returns (Full-Page Routes & Aliases) */}
          <Route path="purchase/returns" element={<PurchaseReturns />} />
          <Route path="purchase/returns/create" element={<PurchaseReturnForm />} />
          <Route path="purchase/returns/:id/edit" element={<PurchaseReturnForm />} />
          <Route path="purchase-returns" element={<PurchaseReturns />} />
          <Route path="purchase-returns/create" element={<PurchaseReturnForm />} />
          <Route path="purchase-returns/edit/:id" element={<PurchaseReturnForm />} />
          <Route path="purchase-returns/:id/edit" element={<PurchaseReturnForm />} />

          <Route path="*" element={<Navigate to="/sales/orders" replace />} />
        </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
